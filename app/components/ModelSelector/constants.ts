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
    poweredBy: "Kilo Gateway (free)",
  },
  {
    id: "umbraa-pro",
    label: "Qwen 3.7 Plus",
    description: "Superior performance for complex work",
    poweredBy: "Kilo Gateway (free)",
  },
  {
    id: "umbraa-max",
    label: "Nemotron 3 Super 120B",
    description: "Maximum intelligence for hard problems",
    poweredBy: "Kilo Gateway (free)",
  },
  {
    id: "umbraa-coder",
    label: "Qwen 3 Coder",
    description: "Specialized in programming tasks",
    poweredBy: "Kilo Gateway (free)",
  },
  {
    id: "umbraa-gpt-oss",
    label: "GPT-OSS 120B",
    description: "Massive open-source intelligence",
    poweredBy: "Kilo Gateway (free)",
  },
  {
    id: "umbraa-llama",
    label: "Llama 4 Maverick",
    description: "Latest Meta open-source model",
    poweredBy: "Kilo Gateway (free)",
  },
];

export const AGENT_MODEL_OPTIONS: ModelOption[] = [
  {
    id: "umbraa-standard",
    label: "DeepSeek V4 Flash",
    description: "Fast and efficient agent",
    poweredBy: "Kilo Gateway (free)",
    thinking: true,
  },
  {
    id: "umbraa-pro",
    label: "Qwen 3.7 Plus",
    description: "Superior agent performance",
    poweredBy: "Kilo Gateway (free)",
    thinking: true,
  },
  {
    id: "umbraa-max",
    label: "Nemotron 3 Super 120B",
    description: "Maximum agent intelligence",
    poweredBy: "Kilo Gateway (free)",
    thinking: true,
  },
  {
    id: "umbraa-coder",
    label: "Qwen 3 Coder",
    description: "Specialized coding agent",
    poweredBy: "Kilo Gateway (free)",
    thinking: true,
  },
  {
    id: "umbraa-gpt-oss",
    label: "GPT-OSS 120B",
    description: "Massive intelligence agent",
    poweredBy: "Kilo Gateway (free)",
    thinking: true,
  },
  {
    id: "umbraa-llama",
    label: "Llama 4 Maverick",
    description: "Llama-powered agent",
    poweredBy: "Kilo Gateway (free)",
    thinking: true,
  },
];

export const getDefaultModelForMode = (mode: ChatMode): SelectedModel => {
  const options = isAgentMode(mode) ? AGENT_MODEL_OPTIONS : ASK_MODEL_OPTIONS;
  return options[0].id;
};
