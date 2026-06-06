/**
 * Tests for sandbox capabilities required for penetration testing tools.
 *
 * Background:
 * - Network tools (ping, nmap, etc.) require raw socket access
 * - E2B sandbox: runs as 'user' by default, needs user: "root" option
 * - Docker sandbox: needs --cap-add flags (NET_RAW, NET_ADMIN, SYS_PTRACE)
 *
 * See commits:
 * - 6d5d1df: Removed hardcoded user:root (broke E2B network tools)
 * - 713f6ad: Added Docker capabilities
 * - 3fde55c: Restored user:root for E2B only
 */

import {
  buildSandboxCommandOptions,
  MAX_COMMAND_EXECUTION_TIME,
} from "../utils/sandbox-command-options";
import { isE2BSandbox } from "../utils/sandbox-types";

// Mock E2B sandbox (has jupyterUrl property - this is how isE2BSandbox detects it)
const createMockE2BSandbox = () => ({
  jupyterUrl: "http://localhost:8888",
  commands: { run: jest.fn() },
});

describe("Sandbox Capabilities for Network Tools", () => {
  describe("buildSandboxCommandOptions", () => {
    it("should include user:root and cwd:/home/user for E2B sandbox", () => {
      const e2bSandbox = createMockE2BSandbox();

      const options = buildSandboxCommandOptions(e2bSandbox as any);

      expect(options).toHaveProperty("user", "root");
      expect(options).toHaveProperty("cwd", "/home/user");
      expect(options.timeoutMs).toBe(MAX_COMMAND_EXECUTION_TIME);
    });

    it("should include handlers when provided", () => {
      const e2bSandbox = createMockE2BSandbox();
      const onStdout = jest.fn();
      const onStderr = jest.fn();

      const options = buildSandboxCommandOptions(e2bSandbox as any, {
        onStdout,
        onStderr,
      });

      expect(options.onStdout).toBe(onStdout);
      expect(options.onStderr).toBe(onStderr);
    });
  });

  describe("Sandbox Type Detection", () => {
    it("should correctly identify E2B sandbox and reject null", () => {
      const e2bSandbox = createMockE2BSandbox();

      expect(isE2BSandbox(e2bSandbox as any)).toBe(true);
      expect(isE2BSandbox(null)).toBe(false);
    });
  });
});
