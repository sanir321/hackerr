import { Sandbox } from "@e2b/code-interpreter";
import type {
  SandboxBootInfo,
  SandboxManager,
  SandboxType,
  SubscriptionTier,
} from "@/types";
import type { ConnectionInfo } from "./sandbox-types";
import { ensureSandboxConnection } from "./sandbox";
import { SANDBOX_ENVIRONMENT_TOOLS } from "./sandbox-tools";

type SandboxInstance = Sandbox;

// "e2b" for cloud sandbox
export type SandboxPreference = "e2b";

export interface SandboxFallbackInfo {
  occurred: boolean;
  reason?: "connection_unavailable" | "no_local_connections";
  requestedPreference: SandboxPreference;
  actualSandbox: "e2b" | string;
  actualSandboxName?: string;
}

/**
 * Sandbox manager that handles E2B cloud sandboxes.
 */
const MAX_SANDBOX_HEALTH_FAILURES = 5;

export class HybridSandboxManager implements SandboxManager {
  private sandbox: SandboxInstance | null = null;
  private pendingFallbackInfo: SandboxFallbackInfo | null = null;
  private healthFailureCount = 0;
  private sandboxUnavailable = false;
  private justBooted = true;

  constructor(
    private userID: string,
    private setSandboxCallback: (sandbox: SandboxInstance) => void,
    private sandboxPreference: SandboxPreference = "e2b",
    private serviceKey: string,
    initialSandbox?: Sandbox | null,
    private subscription?: SubscriptionTier,
    private onBoot?: (info: SandboxBootInfo) => void,
  ) {
    this.sandbox = initialSandbox || null;
  }

  /**
   * Returns true if the sandbox was just booted/resumed (first command).
   * Caller should skip health check for the first command to avoid latency.
   */
  consumeJustBooted(): boolean {
    if (this.justBooted) {
      this.justBooted = false;
      return true;
    }
    return false;
  }

  recordHealthFailure(): boolean {
    this.healthFailureCount++;
    if (this.healthFailureCount >= MAX_SANDBOX_HEALTH_FAILURES) {
      console.warn(
        `[${this.userID}] E2B sandbox health failures exceeded threshold, marking unavailable`,
      );
      this.sandboxUnavailable = true;
    }
    return this.sandboxUnavailable;
  }

  resetHealthFailures(): void {
    this.healthFailureCount = 0;
    this.sandboxUnavailable = false;
  }

  isSandboxUnavailable(): boolean {
    return this.sandboxUnavailable;
  }

  getEffectivePreference(): SandboxPreference {
    return "e2b";
  }

  getOsContext(): string | null {
    return null;
  }

  async setSandboxPreference(preference: SandboxPreference): Promise<void> {
    this.sandboxPreference = "e2b";
  }

  consumeFallbackInfo(): SandboxFallbackInfo | null {
    const info = this.pendingFallbackInfo;
    this.pendingFallbackInfo = null;
    return info;
  }

  getSandboxInfo(): { type: SandboxType; name?: string } | null {
    return { type: "e2b" };
  }

  getSandboxType(toolName: string): SandboxType | undefined {
    if (!(SANDBOX_ENVIRONMENT_TOOLS as readonly string[]).includes(toolName)) {
      return undefined;
    }
    return "e2b";
  }

  async supportsInteractivePty(): Promise<boolean> {
    return true;
  }

  async listConnections(): Promise<ConnectionInfo[]> {
    return [];
  }

  async getSandbox(): Promise<{ sandbox: SandboxInstance }> {
    if (this.subscription === "free") {
      throw new Error("Cloud sandbox requires a paid plan.");
    }
    return this.getE2BSandbox();
  }

  private async getE2BSandbox(): Promise<{ sandbox: Sandbox }> {
    if (this.sandbox && this.sandbox instanceof Sandbox) {
      return { sandbox: this.sandbox };
    }

    const result = await ensureSandboxConnection(
      {
        userID: this.userID,
        setSandbox: (sandbox) => {
          this.sandbox = sandbox;
          this.setSandboxCallback(sandbox);
        },
        onBoot: this.onBoot,
      },
      {
        initialSandbox: this.sandbox as Sandbox | null,
      },
    );

    this.sandbox = result.sandbox;
    this.setSandboxCallback(result.sandbox);

    return { sandbox: result.sandbox };
  }

  setSandbox(sandbox: SandboxInstance): void {
    this.sandbox = sandbox;
    this.setSandboxCallback(sandbox);
  }

  async getSandboxContextForPrompt(): Promise<string | null> {
    return null;
  }
}
