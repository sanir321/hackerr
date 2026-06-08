import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import type { SubscriptionTier } from "@/types/chat";

let mockSubscription: SubscriptionTier;

jest.mock("@/app/contexts/GlobalState", () => ({
  useGlobalState: () => ({
    subscription: mockSubscription,
  }),
}));

jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

const { ModelSelector } = jest.requireActual<
  typeof import("../../ModelSelector")
>("../../ModelSelector");

describe("ModelSelector", () => {
  beforeEach(() => {
    mockSubscription = "pro-plus";
  });

  it("shows model choices immediately while Auto is selected", () => {
    render(<ModelSelector value="auto" onChange={jest.fn()} mode="ask" />);

    fireEvent.click(screen.getByRole("button", { name: /^Auto$/i }));

    expect(
      screen.getByText(
        "Balanced quality and speed, recommended for most tasks",
      ),
    ).toBeVisible();
    expect(screen.getByText("DeepSeek V4 Flash")).toBeVisible();
    expect(screen.getByText("Nemotron 3 Ultra 550B")).toBeVisible();
    expect(screen.getByText("Owl Alpha")).toBeVisible();
    expect(screen.getByText("Nemotron 3 Nano Omni")).toBeVisible();

    expect(
      screen.getByRole("button", { name: /DeepSeek V4 Flash/i }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("selects Auto as a first-class option", () => {
    const onChange = jest.fn();
    render(
      <ModelSelector value="umbraa-pro" onChange={onChange} mode="ask" />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Nemotron 3 Ultra 550B/i }));
    fireEvent.click(
      screen.getByRole("button", {
        name: /Auto Balanced quality and speed/i,
      }),
    );

    expect(onChange).toHaveBeenCalledWith("auto");
  });
});
