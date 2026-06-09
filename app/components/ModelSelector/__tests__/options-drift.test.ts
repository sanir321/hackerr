import { describe, it, expect } from "@jest/globals";
import { ASK_MODEL_OPTIONS, AGENT_MODEL_OPTIONS } from "../constants";
import { myProvider, resolveTierToProviderKey } from "@/lib/ai/providers";
import type { ChatMode } from "@/types/chat";

/**
 * Drift guard: every selectable Umbraa tier must resolve to a provider key
 * registered with `myProvider` in *both* modes. Without this, picking the
 * tier from the UI would crash on `myProvider.languageModel()`.
 */
describe("ModelSelector tier ↔ provider drift", () => {
  const allOptions = [...ASK_MODEL_OPTIONS, ...AGENT_MODEL_OPTIONS];

  it("every option in both lineups resolves to a registered provider", () => {
    for (const mode of ["ask", "agent"] as ChatMode[]) {
      const options =
        mode === "agent" ? AGENT_MODEL_OPTIONS : ASK_MODEL_OPTIONS;
      for (const option of options) {
        const providerKey = resolveTierToProviderKey(option.id, mode);
        expect(providerKey).not.toBeNull();
        expect(() =>
          myProvider.languageModel(providerKey as string),
        ).not.toThrow();
      }
    }
  });

  it("ask + agent lineups expose the same tier ids", () => {
    const askIds = new Set(ASK_MODEL_OPTIONS.map((o) => o.id));
    const agentIds = new Set(AGENT_MODEL_OPTIONS.map((o) => o.id));
    expect([...askIds].sort()).toEqual([...agentIds].sort());
  });

  it("Umbraa Standard resolves to model-standard in both modes", () => {
    expect(resolveTierToProviderKey("umbraa-standard", "ask")).toBe(
      "model-standard",
    );
    expect(resolveTierToProviderKey("umbraa-standard", "agent")).toBe(
      "model-standard",
    );
  });

  it("Umbraa Pro resolves to model-pro in both modes", () => {
    expect(resolveTierToProviderKey("umbraa-pro", "ask")).toBe(
      "model-pro",
    );
    expect(resolveTierToProviderKey("umbraa-pro", "agent")).toBe(
      "model-pro",
    );
  });

  it("Umbraa Owl resolves to owl-alpha in both modes", () => {
    expect(resolveTierToProviderKey("umbraa-owl", "ask")).toBe(
      "model-owl-alpha",
    );
    expect(resolveTierToProviderKey("umbraa-owl", "agent")).toBe(
      "model-owl-alpha",
    );
  });

  it("Umbraa Reason resolves to reasoning model in both modes", () => {
    expect(resolveTierToProviderKey("umbraa-reason", "ask")).toBe(
      "model-reasoning",
    );
    expect(resolveTierToProviderKey("umbraa-reason", "agent")).toBe(
      "model-reasoning",
    );
  });

  it("'auto' returns null (caller routes to the auto router)", () => {
    expect(resolveTierToProviderKey("auto", "ask")).toBeNull();
    expect(resolveTierToProviderKey("auto", "agent")).toBeNull();
  });

  it("hover-popup descriptions are present for every tier", () => {
    for (const option of allOptions) {
      expect(option.description).toBeTruthy();
    }
  });
});
