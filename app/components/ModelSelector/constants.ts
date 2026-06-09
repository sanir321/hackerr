import type { ChatMode, SelectedModel } from "@/types/chat";
import { isAgentMode } from "@/lib/utils/mode-helpers";

export interface ModelOption {
  id: SelectedModel;
  label: string;
  /** Short tagline shown in the hover popup (e.g. "Maximum intelligence for complex work") */
  description?: string;
  /** "Powered by …" line shown beneath the description in the hover popup */
  poweredBy?: string;
  thinking?: boolean;
}

export const ASK_MODEL_OPTIONS: ModelOption[] = [
  {
    id: "umbraa-owl",
    label: "Owl Alpha",
    description: "Fast, 1M context window for long documents",
    poweredBy: "OpenRouter",
  },
  {
    id: "umbraa-standard",
    label: "Owl Alpha (Standard)",
    description: "Reliable general-purpose model",
    poweredBy: "OpenRouter",
  },
  {
    id: "umbraa-pro",
    label: "Nex N2 Pro",
    description: "Capable general-purpose model",
    poweredBy: "Novita AI",
  },
  {
    id: "umbraa-reason",
    label: "Nemotron 3 Super (Reasoning)",
    description: "Built-in reasoning for complex problems",
    poweredBy: "NVIDIA",
    thinking: true,
  },
];

export const AGENT_MODEL_OPTIONS: ModelOption[] = [
  {
    id: "umbraa-reason",
    label: "Nemotron 3 Super",
    description: "Best for tool-calling agent tasks",
    poweredBy: "NVIDIA",
    thinking: true,
  },
  {
    id: "umbraa-owl",
    label: "Owl Alpha (Agent)",
    description: "Fast agent with 1M context",
    poweredBy: "OpenRouter",
    thinking: true,
  },
  {
    id: "umbraa-standard",
    label: "Owl Alpha (Standard)",
    description: "Reliable agent for general tasks",
    poweredBy: "OpenRouter",
    thinking: true,
  },
  {
    id: "umbraa-pro",
    label: "Nex N2 Pro (Agent)",
    description: "Capable agent for complex tasks",
    poweredBy: "Novita AI",
    thinking: true,
  },
];

export const getDefaultModelForMode = (mode: ChatMode): SelectedModel => {
  const options = isAgentMode(mode) ? AGENT_MODEL_OPTIONS : ASK_MODEL_OPTIONS;
  return options[0].id;
};
