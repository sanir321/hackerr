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
    id: "umbraa-standard",
    label: "DeepSeek V4 Flash",
    description: "Fast and efficient for everyday tasks",
  },
  {
    id: "umbraa-pro",
    label: "Nemotron 3 Ultra 550B",
    description: "Most powerful free model, 1M context",
  },
  {
    id: "umbraa-owl",
    label: "Owl Alpha",
    description: "Massive 1M context window for long documents",
  },
  {
    id: "umbraa-reason",
    label: "Nemotron 3 Nano Omni",
    description: "Built-in reasoning for complex problems",
    thinking: true,
  },
];

export const AGENT_MODEL_OPTIONS: ModelOption[] = [
  {
    id: "umbraa-standard",
    label: "DeepSeek V4 Flash",
    description: "Fast and efficient agent",
    thinking: true,
  },
  {
    id: "umbraa-pro",
    label: "Nemotron 3 Ultra 550B",
    description: "Most powerful agent, 1M context",
    thinking: true,
  },
  {
    id: "umbraa-owl",
    label: "Owl Alpha",
    description: "Agent with massive 1M context",
    thinking: true,
  },
  {
    id: "umbraa-reason",
    label: "Nemotron 3 Nano Omni",
    description: "Reasoning agent for complex problems",
    thinking: true,
  },
];

export const getDefaultModelForMode = (mode: ChatMode): SelectedModel => {
  const options = isAgentMode(mode) ? AGENT_MODEL_OPTIONS : ASK_MODEL_OPTIONS;
  return options[0].id;
};
