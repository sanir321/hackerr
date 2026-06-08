import { customProvider } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createOpenAI } from "@ai-sdk/openai";
import type { ChatMode, SelectedModel } from "@/types/chat";
import { isAgentMode } from "@/lib/utils/mode-helpers";
import { openrouterAttributionHeaders } from "@/lib/ai/openrouter-attribution";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isXaiModelSlug = (value: unknown): boolean =>
  typeof value === "string" && value.toLowerCase().startsWith("x-ai/");

const requestCanRouteToXai = (body: unknown): boolean => {
  if (!isRecord(body)) return false;
  if (isXaiModelSlug(body.model)) return true;
  return Array.isArray(body.models) && body.models.some(isXaiModelSlug);
};

const hasOwnEncryptedContent = (value: unknown): boolean =>
  isRecord(value) && Object.hasOwn(value, "encrypted_content");

const stripEncryptedContent = (
  value: unknown,
  inReasoningDetails = false,
): { value: unknown; changed: boolean } => {
  if (Array.isArray(value)) {
    let changed = false;
    const cleaned: unknown[] = [];

    for (const item of value) {
      if (inReasoningDetails && hasOwnEncryptedContent(item)) {
        changed = true;
        continue;
      }
      const result = stripEncryptedContent(item, inReasoningDetails);
      changed ||= result.changed;
      cleaned.push(result.value);
    }

    return changed ? { value: cleaned, changed } : { value, changed: false };
  }

  if (!isRecord(value)) {
    return { value, changed: false };
  }

  let changed = false;
  const cleaned: Record<string, unknown> = {};

  for (const [key, entryValue] of Object.entries(value)) {
    if (inReasoningDetails && key === "encrypted_content") {
      changed = true;
      continue;
    }

    const nextInReasoningDetails =
      inReasoningDetails || key === "reasoning_details";
    const result = stripEncryptedContent(entryValue, nextInReasoningDetails);
    changed ||= result.changed;

    if (
      key === "reasoning_details" &&
      Array.isArray(result.value) &&
      result.value.length === 0
    ) {
      changed = true;
      continue;
    }

    cleaned[key] = result.value;
  }

  return changed ? { value: cleaned, changed } : { value, changed: false };
};

export const sanitizeOpenRouterRequestForXai = (
  body: unknown,
): { body: unknown; changed: boolean } => {
  if (
    !isRecord(body) ||
    !requestCanRouteToXai(body) ||
    !Array.isArray(body.messages)
  ) {
    return { body, changed: false };
  }

  let changed = false;
  const messages = body.messages.map((message) => {
    const result = stripEncryptedContent(message);
    changed ||= result.changed;
    return result.value;
  });

  if (!changed) return { body, changed: false };
  return { body: { ...body, messages }, changed: true };
};

const patchKimiReasoningToolCalls = (
  body: unknown,
): { body: unknown; changed: boolean } => {
  if (!isRecord(body)) return { body, changed: false };
  if (
    !Array.isArray(body.messages) ||
    !isRecord(body.reasoning) ||
    body.reasoning.enabled !== true
  ) {
    return { body, changed: false };
  }

  let changed = false;
  const messages = body.messages.map((message) => {
    if (
      isRecord(message) &&
      message.role === "assistant" &&
      Array.isArray(message.tool_calls) &&
      message.tool_calls.length > 0 &&
      !message.reasoning
    ) {
      changed = true;
      return { ...message, reasoning: "." };
    }
    return message;
  });

  return changed
    ? { body: { ...body, messages }, changed: true }
    : { body, changed: false };
};

const OPENROUTER_METADATA_HEADER = "X-OpenRouter-Experimental-Metadata";

const withOpenRouterMetadataHeader = (
  headers: HeadersInit | undefined,
): Headers => {
  const nextHeaders = new Headers(headers);
  if (!nextHeaders.has(OPENROUTER_METADATA_HEADER)) {
    nextHeaders.set(OPENROUTER_METADATA_HEADER, "enabled");
  }
  return nextHeaders;
};

// Custom fetch for OpenRouter provider-specific request-body repairs.
const openrouterPatchFetch: typeof fetch = async (url, init) => {
  let nextInit: RequestInit = {
    ...init,
    headers: withOpenRouterMetadataHeader(init?.headers),
  };

  if (nextInit.body && typeof nextInit.body === "string") {
    try {
      const parsedBody = JSON.parse(nextInit.body) as unknown;
      const kimiPatched = patchKimiReasoningToolCalls(parsedBody);
      const xaiPatched = sanitizeOpenRouterRequestForXai(kimiPatched.body);
      if (kimiPatched.changed || xaiPatched.changed) {
        nextInit = { ...nextInit, body: JSON.stringify(xaiPatched.body) };
      }
    } catch {
      // If parsing fails, send the request as-is
    }
  }
  return globalThis.fetch(url, nextInit);
};

const openrouterBaseUrl = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";

const openrouter = createOpenRouter({
  fetch: openrouterPatchFetch,
  headers: openrouterAttributionHeaders,
});

const kiloGateway = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: openrouterBaseUrl,
});

const buildProviderMap = (gateway: ReturnType<typeof createOpenAI>) => {
  // SaaS mode: Always route all models through Kilo Gateway/OpenRouter free models
  const standard = gateway("kilo-auto/free");
  const pro = gateway("qwen/qwen3.7-plus:free");
  const max = gateway("nvidia/nemotron-3-super:free");
  const auto = gateway("kilo-auto/free");
  const coder = gateway("qwen/qwen3-coder:free");
  const gptOss = gateway("openai/gpt-oss-120b:free");
  const llama4 = gateway("meta-llama/llama-4-maverick:free");
  const deepseek = gateway("deepseek/deepseek-v4-flash:free");

  return {
    "ask-model": auto,
    "ask-model-free": auto,
    "agent-model": auto,
    "agent-model-free": auto,
    "model-sonnet-4.6": pro,
    "model-gemini-3-flash": auto,
    "model-deepseek-v4-flash": deepseek,
    "model-opus-4.6": gptOss,
    "model-kimi-k2.6": pro,
    "model-llama-4": llama4,
    "model-qwen-coder": coder,
    "fallback-agent-model": auto,
    "fallback-ask-model": auto,
    "fallback-gemini-3.5-flash": auto,
    "fallback-grok-4.3": auto,
    "title-generator-model": standard,
  } as Record<string, any>;
};

const baseProviders = buildProviderMap(kiloGateway);

export type ModelName = keyof typeof baseProviders;

export const modelCutoffDates: Record<ModelName, string> &
  Record<string, string> = {
  "ask-model": "May 2025",
  "ask-model-free": "May 2025",
  "agent-model": "May 2025",
  "agent-model-free": "May 2025",
  "model-sonnet-4.6": "May 2025",
  "model-gemini-3-flash": "January 2025",
  "model-deepseek-v4-flash": "May 2025",
  "model-opus-4.6": "May 2025",
  "model-kimi-k2.6": "April 2024",
  "model-llama-4": "January 2026",
  "model-qwen-coder": "March 2026",
  "fallback-agent-model": "January 2025",
  "fallback-ask-model": "January 2025",
  "fallback-gemini-3.5-flash": "May 2026",
  "fallback-grok-4.3": "December 2025",
  "title-generator-model": "January 2025",
};

export const modelDisplayNames: Record<ModelName, string> &
  Record<string, string> = {
  "ask-model": "Auto — intelligent model router",
  "ask-model-free": "Auto — intelligent model router",
  "agent-model": "Auto — intelligent model router",
  "agent-model-free": "Auto — intelligent model router",
  "model-sonnet-4.6": "Qwen 3.7 Plus (Free)",
  "model-gemini-3-flash": "Kilo Auto Free",
  "model-deepseek-v4-flash": "DeepSeek V4 Flash (Free)",
  "model-opus-4.6": "GPT-OSS 120B (Free)",
  "model-kimi-k2.6": "Qwen 3.7 Plus (Free)",
  "model-llama-4": "Llama 4 Maverick (Free)",
  "model-qwen-coder": "Qwen 3 Coder (Free)",
  "fallback-agent-model": "Auto — intelligent model router",
  "fallback-ask-model": "Auto — intelligent model router",
  "fallback-gemini-3.5-flash": "Kilo Auto Free",
  "fallback-grok-4.3": "Auto — intelligent model router",
  "title-generator-model": "DeepSeek V4 Flash (Free)",
};

export const getModelDisplayName = (modelName: ModelName): string => {
  return modelDisplayNames[modelName];
};

export const getModelCutoffDate = (modelName: ModelName): string => {
  return modelCutoffDates[modelName];
};

export function isAnthropicModel(modelName: string): boolean {
  return modelName.includes("sonnet") || modelName.includes("opus");
}

export function isDeepSeekModel(modelName: string): boolean {
  return (
    modelName === "ask-model-free" ||
    modelName === "agent-model-free" ||
    modelName === "model-deepseek-v4-flash"
  );
}

export function supportsMultimodalToolResults(modelName?: string): boolean {
  if (!modelName) return false;

  const normalized = modelName.toLowerCase();

  return (
    normalized === "ask-model" ||
    normalized.includes("gemini") ||
    normalized.includes("google/") ||
    isAnthropicModel(normalized) ||
    normalized.includes("anthropic/") ||
    normalized.includes("claude") ||
    normalized.includes("openai/") ||
    normalized.includes("gpt-") ||
    normalized.includes("o1") ||
    normalized.includes("o3") ||
    normalized.includes("o4") ||
    normalized.includes("x-ai/") ||
    normalized.includes("grok")
  );
}

export function isGeminiModel(modelName: string): boolean {
  return modelName === "ask-model" || modelName === "model-gemini-3-flash";
}

/**
 * Map a Umbraa tier id to the underlying provider key for a given mode.
 */
export function resolveTierToProviderKey(
  tier: SelectedModel,
  mode: ChatMode,
): ModelName | null {
  if (tier === "auto") return null;

  switch (tier) {
    case "umbraa-standard":
      return isAgentMode(mode) ? "model-kimi-k2.6" : "model-gemini-3-flash";
    case "umbraa-pro":
      return "model-sonnet-4.6";
    case "umbraa-max":
      return "model-opus-4.6";
    case "umbraa-coder":
      return "model-qwen-coder";
    case "umbraa-gpt-oss":
      return "model-opus-4.6"; // Reuse GPT-OSS mapping
    case "umbraa-llama":
      return "model-llama-4";
    default:
      return "model-deepseek-v4-flash";
  }
}

export const myProvider = customProvider({
  languageModels: baseProviders,
});

export const createTrackedProvider = () => {
  return myProvider;
};
