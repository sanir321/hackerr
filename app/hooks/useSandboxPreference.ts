"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { SandboxPreference } from "@/types/chat";

interface SandboxPreferenceState {
  sandboxPreference: SandboxPreference;
  setSandboxPreference: (preference: SandboxPreference) => void;
  desktopBridgeActive: boolean;
}

export function useSandboxPreference(
  isAuthenticated: boolean,
): SandboxPreferenceState {
  const [desktopBridgeActive] = useState(false);

  const [sandboxPreference, setSandboxPreferenceState] =
    useState<SandboxPreference>(() => {
      if (typeof window === "undefined") return "e2b";
      const stored = localStorage.getItem("sandbox-preference");
      if (stored && stored !== "tauri") return stored as SandboxPreference;
      return "e2b";
    });

  const PERSISTABLE_PREFERENCES = new Set(["e2b", "desktop"]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (
      typeof window !== "undefined" &&
      PERSISTABLE_PREFERENCES.has(sandboxPreference)
    ) {
      localStorage.setItem("sandbox-preference", sandboxPreference);
    }
  }, [sandboxPreference]);

  const setSandboxPreference = useCallback((preference: SandboxPreference) => {
    setSandboxPreferenceState(preference);
  }, []);

  return { sandboxPreference, setSandboxPreference, desktopBridgeActive };
}
