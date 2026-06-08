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
    label: "Qwen 3.7 Plus",
    description: "Superior performance for complex work",
  },
  {
    id: "umbraa-max",
    label: "Nemotron 3 Super 120B",
    description: "Maximum intelligence for hard problems",
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
    label: "Qwen 3.7 Plus",
    description: "Superior agent performance",
    thinking: true,
  },
  {
    id: "umbraa-max",
    label: "Nemotron 3 Super 120B",
    description: "Maximum agent intelligence",
    thinking: true,
  },
];

export const getDefaultModelForMode = (mode: ChatMode): SelectedModel => {
  const options = isAgentMode(mode) ? AGENT_MODEL_OPTIONS : ASK_MODEL_OPTIONS;
  return options[0].id;
};
