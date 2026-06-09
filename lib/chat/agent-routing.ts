import type { ChatMode } from "@/types";

export function shouldUseAgentLongForAgent({
  mode,
}: {
  mode: ChatMode | string;
}): boolean {
  // Agent mode now runs directly on Vercel via /api/chat
  // instead of Trigger.dev (no env vars configured there)
  return false;
}
