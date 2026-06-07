import { NextRequest, NextResponse } from "next/server";
import { tasks, auth } from "@trigger.dev/sdk";
import type { agentLongTask } from "@/trigger/agent-long";
import { geolocation } from "@vercel/functions";
import type { UIMessage } from "ai";

import { getUserIDAndPro } from "@/lib/auth/get-user-id";
import { assertUserCanMakeCostIncurringRequest } from "@/lib/suspensions";
import {
  getChatById,
  handleInitialChatAndUserMessage,
  setActiveTriggerRun,
} from "@/lib/db/actions";
import { assertFreeAgentGates } from "@/lib/api/chat-stream-helpers";
import { coerceSelectedModel } from "@/types";
import { ChatSDKError } from "@/lib/errors";
import type { Todo, SandboxPreference, SelectedModel } from "@/types";
import {
  getUploadBasePath,
  rewriteSandboxFilePathsInMessages,
  uploadSandboxFiles,
} from "@/lib/utils/sandbox-file-utils";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const routeStartedAt = Date.now();
  try {
    const {
      messages,
      chatId,
      todos,
      regenerate,
      temporary,
      sandboxPreference,
      selectedModel: rawSelectedModel,
      isAutoContinue,
    }: {
      messages: UIMessage[];
      chatId: string;
      todos?: Todo[];
      regenerate?: boolean;
      temporary?: boolean;
      sandboxPreference?: SandboxPreference;
      selectedModel?: string;
      isAutoContinue?: boolean;
    } = await req.json();

    const selectedModelOverride: SelectedModel | undefined =
      coerceSelectedModel(rawSelectedModel ?? null) ?? undefined;

    const { userId, subscription, organizationId } = await getUserIDAndPro(req);
    await assertUserCanMakeCostIncurringRequest(userId);
    const userLocation = geolocation(req);

    assertFreeAgentGates({
      mode: "agent",
      subscription,
      sandboxPreference,
      rawSelectedModel,
    });

    const requestMessages = Array.isArray(messages) ? messages : [];
    if (!regenerate && !isAutoContinue && requestMessages.length === 0) {
      console.warn(
        JSON.stringify({
          level: "warn",
          event: "agent_long_empty_message_payload_rejected",
          service: "chat-handler",
          timestamp: new Date().toISOString(),
          chat_id: chatId,
          user_id: userId,
          temporary: !!temporary,
          subscription,
        }),
      );
      throw new ChatSDKError(
        "bad_request:api",
        "No message content was found for this request. Please send a new message and try again.",
        {
          empty_prompt: true,
          new_messages_count: 0,
        },
      );
    }

    // Fetch existing chat to: (a) detect isNewChat for title generation,
    // (b) pass to handleInitialChatAndUserMessage so it skips saveChat on
    //     regenerate/auto-continue and does the ownership check instead.
    const existingChat = temporary ? null : await getChatById({ id: chatId });
    const isNewChat =
      !temporary && !existingChat && !regenerate && !isAutoContinue;

    if (!temporary) {
      await handleInitialChatAndUserMessage({
        chatId,
        userId,
        messages: requestMessages,
        regenerate,
        chat: existingChat ?? null,
        isHidden: isAutoContinue ? true : undefined,
      });
    }

    const triggerTags = [`user_${userId}`, `chat_${chatId}`];
    if (subscription !== "free") triggerTags.push(`sub_${subscription}`);

    const triggerRequestedAt = Date.now();
    const handle = await tasks.trigger<typeof agentLongTask>(
      "agent-long",
      {
        chatId,
        userId,
        subscription,
        organizationId,
        messages: temporary ? requestMessages : [],
        baseTodos: Array.isArray(todos) ? todos : [],
        sandboxPreference,
        selectedModel: selectedModelOverride,
        userLocation,
        temporary,
        isAutoContinue,
        regenerate,
        isNewChat,
        convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL,
        requestTiming: {
          routeStartedAt,
          triggerRequestedAt,
        },
      },
      {
        tags: triggerTags,
        metadata: {
          status: "queued",
          chatId,
          userId,
          subscription,
          loginRequired: false,
          routeStartedAt,
          triggerRequestedAt,
          triggerPayloadMessageCount: temporary ? requestMessages.length : 0,
        },
      },
    );

    const triggerCompletedAt = Date.now();

    // Public access token scoped to this run only — the client uses it to
    // subscribe to the realtime stream without ever seeing TRIGGER_SECRET_KEY.
    // Updating Convex with the active run id is independent, so overlap both
    // network calls before returning the handle to the browser.
    const [publicAccessToken] = await Promise.all([
      auth.createPublicToken({
        scopes: { read: { runs: [handle.id] } },
        // 6h is enough to cover the 1h max task duration plus reconnect grace.
        expirationTime: "6h",
      }),
      temporary
        ? Promise.resolve(null)
        : setActiveTriggerRun({ chatId, triggerRunId: handle.id }),
    ]);

    console.info("[/api/agent-long] started trigger run", {
      chatId,
      runId: handle.id,
      routeDurationMs: Date.now() - routeStartedAt,
      triggerDurationMs: triggerCompletedAt - triggerRequestedAt,
      triggerPayloadMessageCount: temporary ? requestMessages.length : 0,
      temporary: !!temporary,
    });

    return NextResponse.json({
      runId: handle.id,
      publicAccessToken,
    });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    console.error("[/api/agent-long] failed to trigger task:", error);
    return new NextResponse("Failed to start agent-long run", { status: 500 });
  }
}
