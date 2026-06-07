import { shouldUseAgentLongForAgent } from "../agent-routing";

describe("agent routing", () => {
  test("routes agent mode through agent-long", () => {
    expect(
      shouldUseAgentLongForAgent({
        mode: "agent",
      }),
    ).toBe(true);
  });

  test("does not route non-agent modes through agent-long", () => {
    expect(
      shouldUseAgentLongForAgent({
        mode: "ask",
      }),
    ).toBe(false);
  });
});
