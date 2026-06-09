/**
 * Chat Handler Wide Event Logger
 *
 * Encapsulates wide event logging for chat/agent API requests.
 * Keeps the chat handler clean by providing a simple interface.
 */

import {
  createWideEventBuilder,
  logger,
  type ChatWideEvent,
  type WideEventBuilder,
} from "@/lib/logger";
import type {
  CaidoReadyInfo,
  ChatMode,
  ExtraUsageConfig,
  SandboxBootInfo,
} from "@/types";
import type { ChatSDKError } from "@/lib/errors";
import type { OpenRouterModelMetadata } from "@/lib/api/openrouter-metadata";
import {
  extractErrorDetails,
  extractRetryAttempts,
  getProviderErrorCategory,
  getProviderStatusCode,
  type ProviderErrorCategory,
} from "@/lib/utils/error-utils";

export interface ChatLoggerConfig {
  chatId: string;
  endpoint: "/api/chat";
}

export interface RequestDetails {
  mode: ChatMode;
  isTemporary: boolean;
  isRegenerate: boolean;
}

export interface UserContext {
  id: string;
  subscription: string;
  region?: string;
}

export interface ChatContext {
  messageCount: number;
  estimatedInputTokens: number;
  isNewChat: boolean;
  fileCount?: number;
  imageCount?: number;
  memoryEnabled: boolean;
}

export interface RateLimitContext {
  pointsDeducted?: number;
  extraUsagePointsDeducted?: number;
  monthly?: { remaining: number; limit: number };
  remaining?: number;
  subscription: string;
}

export interface StreamResult {
  finishReason?: string;
  wasAborted: boolean;
  wasPreemptiveTimeout: boolean;
  hadSummarization: boolean;
}

const truncateLogString = (value: string, maxLength = 500): string =>
  value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;

const COMPACT_CHAT_ERROR_METADATA_KEYS = [
  "db_operation",
  "db_error_name",
  "db_error_message",
  "db_error_code",
  "db_failure_stage",
  "finish_reason",
  "message_role",
  "mode",
  "parts_size_kb",
  "part_count",
  "largest_part_type",
  "largest_part_size_kb",
  "tool_part_count",
  "data_part_count",
  "reasoning_chars",
  "was_aborted",
  "was_preemptive_timeout",
  "empty_prompt",
  "truncation_dropped_all_messages",
  "existing_messages_count",
  "new_messages_count",
  "all_messages_count",
  "total_tokens_before",
  "max_tokens",
  "file_ids_count",
  "largest_file_token",
] as const;

const compactChatErrorMetadata = (
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined => {
  if (!metadata) return undefined;

  const compact: Record<string, unknown> = {};
  for (const key of COMPACT_CHAT_ERROR_METADATA_KEYS) {
    const value = metadata[key];
    if (value !== undefined) compact[key] = value;
  }

  return Object.keys(compact).length > 0 ? compact : undefined;
};

const providerErrorEventName = (category: ProviderErrorCategory): string =>
  category === "stream_terminated"
    ? "provider_stream_terminated"
    : "provider_streaming_error";

const providerErrorMessage = (category: ProviderErrorCategory): string =>
  category === "stream_terminated"
    ? "Provider stream terminated"
    : category === "timeout"
      ? "Provider stream timeout"
      : "Provider streaming error";

const providerWideErrorType = (
  category: ProviderErrorCategory | undefined,
): string => {
  if (category === "stream_terminated") return "ProviderStreamTerminated";
  if (category === "timeout") return "ProviderTimeout";
  if (category) return "ProviderError";
  return "UnexpectedError";
};

const isRetriableProviderCategory = (
  category: ProviderErrorCategory,
): boolean =>
  category === "rate_limited" ||
  category === "provider_5xx" ||
  category === "stream_terminated" ||
  category === "timeout";

/**
 * Creates a chat logger instance for tracking wide events
 */
export function createChatLogger(config: ChatLoggerConfig) {
  const builder = createWideEventBuilder(config.chatId, config.endpoint);

  // Cache identity/context fields so emitChatError can fire discrete PostHog
  // events (e.g. monthly_cap_hit) without forcing the call site to thread
  // them through. Populated by the corresponding setX methods below.
  let userId: string | undefined;
  let subscription: string | undefined;
  let mode: ChatMode | undefined;
  let monthlyRemainingPercent: number | undefined;
  let lastProviderErrorCategory: ProviderErrorCategory | undefined;
  let lastProviderErrorStatusCode: number | undefined;

  return {
    /**
     * Set initial request details
     */
    setRequestDetails(details: RequestDetails) {
      mode = details.mode;
      builder.setRequestDetails(details);
    },

    /**
     * Set user context
     */
    setUser(user: UserContext) {
      userId = user.id;
      subscription = user.subscription;
      builder.setUser(user);
    },

    /**
     * Set chat context and model
     */
    setChat(chat: ChatContext, model: string) {
      builder.setChat(chat);
      builder.setModel(model);
    },

    /**
     * Set rate limit and extra usage context
     */
    setRateLimit(
      context: RateLimitContext,
      extraUsageConfig?: ExtraUsageConfig,
    ) {
      monthlyRemainingPercent = context.monthly
        ? Math.round((context.monthly.remaining / context.monthly.limit) * 100)
        : undefined;
      builder.setExtraUsage(extraUsageConfig);
      builder.setRateLimit({
        pointsDeducted: context.pointsDeducted,
        extraUsagePointsDeducted: context.extraUsagePointsDeducted,
        monthlyRemainingPercent,
        freeRemaining:
          context.subscription === "free" ? context.remaining : undefined,
      });
    },

    /**
     * Start stream timing
     */
    startStream() {
      builder.startStream();
    },

    /**
     * Set sandbox execution info
     */
    setSandbox(info: ChatWideEvent["sandbox"] | null) {
      if (info) {
        builder.setSandbox(info);
      }
    },

    /**
     * Record sandbox boot timing (first call wins within a request).
     */
    setSandboxBoot(info: SandboxBootInfo) {
      builder.setSandboxBoot(info);
    },

    /**
     * Record Caido proxy setup timing (first call wins within a request).
     */
    setCaidoReady(info: CaidoReadyInfo) {
      builder.setCaidoReady(info);
    },

    /**
     * Record a tool call
     */
    recordToolCall(name: string, sandboxType?: string) {
      builder.recordToolCall(name, sandboxType);
    },

    /**
     * Set model and usage from stream response
     */
    setStreamResponse(
      responseModel: string | undefined,
      usage: Record<string, unknown> | undefined,
      openRouterMetadata?: OpenRouterModelMetadata,
    ) {
      if (responseModel) {
        builder.setActualModel(responseModel);
      }
      if (openRouterMetadata) {
        builder.setOpenRouterMetadata(openRouterMetadata);
      }
      builder.setUsage(usage);
    },

    /**
     * Record Anthropic prompt repair before provider call.
     */
    recordAnthropicPromptRepair(repair: {
      action: "appended_continue" | "trimmed";
      reason:
        | "useful_assistant_tail"
        | "no_useful_content"
        | "dangling_tool_call";
      trailingAssistantContentTypes?: string[];
      model: string;
    }) {
      builder.recordAnthropicPromptRepair(repair);
    },

    /**
     * Record that OpenRouter served a configured fallback model.
     */
    recordModelFallback(fallback: {
      requested: string | undefined;
      served: string;
      chain: string[];
      model: string;
    }) {
      builder.recordModelFallback({
        served: fallback.served,
        chain: fallback.chain,
      });
    },

    /**
     * Set cache metrics for the wide event
     */
    setCacheMetrics(metrics: {
      cacheHitRate: number | null;
      cacheReadTokens: number;
      cacheWriteTokens: number;
    }) {
      builder.setCacheMetrics(metrics);
    },

    /**
     * Record a provider streaming error. Fans out to:
     *   - Vercel runtime logs (structured JSON via logger.warn/logger.error)
     *   - PostHog telemetry (warnings for transport closes, exceptions for errors)
     *   - The wide event (had_provider_error + provider_error fields)
     *
     * Does NOT change outcome — emitSuccess/emitChatError still decides that.
     */
    recordProviderError(
      error: unknown,
      context: {
        mode?: string;
        model?: string;
        requestedModelSlug?: string;
        fallbackModelSlugs?: string[];
        userId?: string;
        subscription?: string;
        isTemporary?: boolean;
      },
    ) {
      const details = extractErrorDetails(error);
      const attempts = extractRetryAttempts(error);
      const category = getProviderErrorCategory(details);
      const providerStatusCode = getProviderStatusCode(details);
      lastProviderErrorCategory = category;
      lastProviderErrorStatusCode = providerStatusCode;

      const logContext = {
        event: providerErrorEventName(category),
        chat_id: config.chatId,
        endpoint: config.endpoint,
        provider_error_category: category,
        ...context,
        ...details,
        ...(attempts && { provider_attempts: attempts }),
      };

      if (category === "stream_terminated" || category === "timeout") {
        logger.warn(providerErrorMessage(category), logContext);
      } else {
        logger.error(
          providerErrorMessage(category),
          error instanceof Error ? error : undefined,
          logContext,
        );
      }



      builder.markProviderError({
        category,
        statusCode: providerStatusCode,
        url: details.providerUrl as string | undefined,
        reason: (error as { reason?: string })?.reason,
        message: details.errorMessage as string | undefined,
        retriable: details.isRetryable as boolean | undefined,
        attempts,
      });
    },

    /**
     * Finalize and emit success event
     */
    emitSuccess(result: StreamResult) {
      builder.setStreamResult(result);
      if (result.wasAborted) {
        builder.setAborted();
      } else {
        builder.setSuccess();
      }
      logger.info(builder.build());
    },

    /**
     * Finalize and emit error event for ChatSDKError
     */
    emitChatError(error: ChatSDKError) {
      const cause =
        typeof error.cause === "string"
          ? truncateLogString(error.cause)
          : undefined;

      builder.setError({
        type: "ChatSDKError",
        code: `${error.type}:${error.surface}`,
        message: error.message,
        cause,
        statusCode: error.statusCode,
        retriable: error.type === "rate_limit",
        metadata: compactChatErrorMetadata(error.metadata),
      });
      logger.info(builder.build());
    },

    /**
     * Finalize and emit error event for unexpected or previously recorded
     * provider errors.
     */
    emitUnexpectedError(error: unknown) {
      const details = extractErrorDetails(error);
      const inferredProviderCategory = getProviderErrorCategory(details);
      const providerCategory =
        lastProviderErrorCategory ??
        (inferredProviderCategory !== "unknown"
          ? inferredProviderCategory
          : undefined);
      const message =
        (typeof details.errorMessage === "string" &&
          details.errorMessage !== "undefined" &&
          details.errorMessage) ||
        (typeof details.providerErrorMessage === "string"
          ? details.providerErrorMessage
          : undefined) ||
        "Unknown error occurred";

      if (!providerCategory) {
        logger.error(
          "Unexpected error in chat route",
          error instanceof Error ? error : undefined,
          { event: "chat_route_unexpected_error", chatId: config.chatId },
        );
      }

      builder.setError({
        type: providerWideErrorType(providerCategory),
        message,
        statusCode: lastProviderErrorStatusCode ?? 503,
        retriable: providerCategory
          ? isRetriableProviderCategory(providerCategory)
          : false,
      });
      logger.info(builder.build());
    },

    /**
     * Get recorded tool calls
     */
    getToolCalls() {
      return builder.getToolCalls();
    },

    /**
     * Get the underlying builder (for advanced use cases)
     */
    getBuilder(): WideEventBuilder {
      return builder;
    },
  };
}

export type ChatLogger = ReturnType<typeof createChatLogger>;

/**
 * Capture aggregated tool usage to PostHog at end of request.
 * One event is emitted per tool to keep analytics useful while
 * avoiding the cost of one PostHog event per individual tool call.
 */
export function captureToolCalls() {
}

export function captureAgentCompletionAnalytics() {
}

export function captureUsageCost() {
}

export function shutdownPostHog() {
}
