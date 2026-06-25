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
    id: "umbraa-flash",
    label: "StepFun Step 3.7 Flash",
    description: "Fast free model, 262K context",
    poweredBy: "StepFun",
  },
  {
    id: "umbraa-laguna",
    label: "Poolside Laguna XS.2",
    description: "Small, fast, 262K context",
    poweredBy: "Poolside",
  },
  {
    id: "umbraa-openrouter",
    label: "OpenRouter Free",
    description: "Auto-routed free model pool",
    poweredBy: "OpenRouter",
  },
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
    id: "umbraa-code",
    label: "Cohere North Mini Code",
    description: "Code-focused free model",
    poweredBy: "Cohere",
  },
];

export const AGENT_MODEL_OPTIONS: ModelOption[] = [
  {
    id: "umbraa-flash",
    label: "StepFun Step 3.7 Flash",
    description: "Fast tool-calling agent, 262K context",
    poweredBy: "StepFun",
    thinking: true,
  },
  {
    id: "umbraa-laguna",
    label: "Poolside Laguna XS.2",
    description: "Lightweight agent, 262K context",
    poweredBy: "Poolside",
    thinking: true,
  },
  {
    id: "umbraa-code",
    label: "Cohere North Mini Code",
    description: "Code-focused agent, 256K context",
    poweredBy: "Cohere",
    thinking: true,
  },
  {
    id: "umbraa-openrouter",
    label: "OpenRouter Free",
    description: "Auto-routed free model pool for agent tasks",
    poweredBy: "OpenRouter",
    thinking: true,
  },
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
];

export const getDefaultModelForMode = (mode: ChatMode): SelectedModel => {
  const options = isAgentMode(mode) ? AGENT_MODEL_OPTIONS : ASK_MODEL_OPTIONS;
  return options[0].id;
};
