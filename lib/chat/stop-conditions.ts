import type { StopCondition } from "ai";
import {
  detectDoomLoop,
  type MinimalStep,
} from "@/lib/chat/doom-loop-detection";

export const TOKEN_EXHAUSTION_FINISH_REASON = "context-limit";

export const BUDGET_EXHAUSTION_FINISH_REASON = "budget-exhausted";

export function tokenExhaustedAfterSummarization(state: {
  threshold: number;
  getLastStepInputTokens: () => number;
  getHasSummarized: () => boolean;
  onFired: () => void;
}): StopCondition<any> {
  return () => {
    const lastStepInput = state.getLastStepInputTokens();
    const hasSummarized = state.getHasSummarized();
    const shouldStop = hasSummarized && lastStepInput > state.threshold;
    if (shouldStop) {
      state.onFired();
    }
    return shouldStop;
  };
}

export const PREEMPTIVE_TIMEOUT_FINISH_REASON = "preemptive-timeout";
// Must be well under Vercel's 300s hard limit to allow graceful cleanup.
// 240s = 4 minutes leaves 60s for abort + log flush + usage refund.
export const AGENT_MAX_STREAM_DURATION_MS = 4 * 60 * 1000;

export function elapsedTimeExceeds(state: {
  maxDurationMs: number;
  getStartTime: () => number;
  onFired: () => void;
}): StopCondition<any> {
  return () => {
    const elapsed = Date.now() - state.getStartTime();
    const shouldStop = elapsed >= state.maxDurationMs;
    if (shouldStop) state.onFired();
    return shouldStop;
  };
}

export const DOOM_LOOP_FINISH_REASON = "doom-loop";

export function doomLoopDetected(state: {
  onFired: () => void;
}): StopCondition<any> {
  return ({ steps }) => {
    const result = detectDoomLoop(steps as unknown as MinimalStep[]);
    if (result.severity === "halt") {
      state.onFired();
      return true;
    }
    return false;
  };
}
