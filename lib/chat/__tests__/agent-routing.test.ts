import { shouldUseAgentLongForAgent } from "../agent-routing";

describe("agent routing", () => {
  test("routes agent mode through /api/chat (not Trigger.dev)", () => {
    expect(
      shouldUseAgentLongForAgent({
        mode: "agent",
      }),
    ).toBe(false);
  });

  test("does not route non-agent modes through agent-long", () => {
    expect(
      shouldUseAgentLongForAgent({
        mode: "ask",
      }),
    ).toBe(false);
  });
});
