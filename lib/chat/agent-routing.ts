import type { ChatMode } from "@/types";

const UMBRAA_DESKTOP_USER_AGENT_TOKEN = "Umbraa-Desktop";

export const LEGACY_DESKTOP_AGENT_UPDATE_MESSAGE =
  "Agent mode now requires the latest Umbraa Desktop app. Please update Umbraa Desktop, then try again.";

export function isUmbraaDesktopUserAgent(
  userAgent: string | null | undefined = getBrowserUserAgent(),
): boolean {
  return userAgent?.includes(UMBRAA_DESKTOP_USER_AGENT_TOKEN) ?? false;
}

export function isLegacyDesktopAgentClient({
  mode,
  isTauri,
  userAgent,
}: {
  mode: ChatMode | string;
  isTauri: boolean;
  userAgent?: string | null;
}): boolean {
  return mode === "agent" && isTauri && !isUmbraaDesktopUserAgent(userAgent);
}

export function shouldUseAgentLongForAgent({
  mode,
  isTauri,
  userAgent,
}: {
  mode: ChatMode | string;
  subscription?: string | null;
  isTauri: boolean;
  userAgent?: string | null;
}): boolean {
  if (mode !== "agent") return false;

  return !isLegacyDesktopAgentClient({ mode, isTauri, userAgent });
}

function getBrowserUserAgent(): string {
  if (typeof navigator === "undefined") return "";
  return navigator.userAgent;
}
