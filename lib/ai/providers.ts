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
  // Verified working free models on Kilo Gateway (June 2026)
  // Tool support: nemotron-super ✅, owl-alpha ❌, nex-n2-pro ❌, all reasoning models ❌
  const nemotronSuper = gateway("nvidia/nemotron-3-super-120b-a12b:free");
  const owlAlpha = gateway("openrouter/owl-alpha");
  const nexN2Pro = gateway("nex-agi/nex-n2-pro:free");

  return {
    "ask-model": owlAlpha,
    "ask-model-free": owlAlpha,
    // Agent mode: only nemotron-super supports tool calling reliably
    "agent-model": nemotronSuper,
    "agent-model-free": nemotronSuper,
    "model-standard": owlAlpha,
    "model-pro": nexN2Pro,
    "model-owl-alpha": owlAlpha,
    "model-reasoning": nemotronSuper,
    // Fallbacks: different providers to avoid same-provider failures
    "fallback-agent-model": owlAlpha,
    "fallback-ask-model": nemotronSuper,
    "title-generator-model": owlAlpha,
  } as Record<string, any>;
};

const baseProviders = buildProviderMap(kiloGateway);

export type ModelName = keyof typeof baseProviders;

export const modelCutoffDates: Record<ModelName, string> &
  Record<string, string> = {
  "ask-model": "2025",
  "ask-model-free": "2025",
  "agent-model": "2025",
  "agent-model-free": "2025",
  "model-standard": "2025",
  "model-pro": "2025",
  "model-owl-alpha": "2025",
  "model-reasoning": "2025",
  "fallback-agent-model": "2025",
  "fallback-ask-model": "2025",
  "title-generator-model": "2025",
};

export const modelDisplayNames: Record<ModelName, string> &
  Record<string, string> = {
  "ask-model": "Owl Alpha — fast, 1M context",
  "ask-model-free": "Owl Alpha — fast, 1M context",
  "agent-model": "NVIDIA Nemotron 3 Super (free, tool-calling)",
  "agent-model-free": "NVIDIA Nemotron 3 Super (free, tool-calling)",
  "model-standard": "Owl Alpha — fast, 1M context",
  "model-pro": "Nex N2 Pro — capable general model",
  "model-owl-alpha": "Owl Alpha — fast, 1M context",
  "model-reasoning": "NVIDIA Nemotron 3 Super (free, reasoning)",
  "fallback-agent-model": "Owl Alpha — fast, 1M context",
  "fallback-ask-model": "NVIDIA Nemotron 3 Super (free)",
  "title-generator-model": "Owl Alpha",
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
  return false;
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
  return modelName === "ask-model";
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
      return "model-standard";
    case "umbraa-pro":
      return "model-pro";
    case "umbraa-owl":
      return "model-owl-alpha";
    case "umbraa-reason":
      return "model-reasoning";
    default:
      return "model-standard";
  }
}

export const myProvider = customProvider({
  languageModels: baseProviders,
});

export const createTrackedProvider = () => {
  return myProvider;
};
