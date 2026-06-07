import type { ChatMode } from "@/types";

export function shouldUseAgentLongForAgent({
  mode,
}: {
  mode: ChatMode | string;
}): boolean {
  if (mode !== "agent") return false;

  return true;
}
