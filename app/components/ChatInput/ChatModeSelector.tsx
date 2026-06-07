"use client";

import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { ModeSelectorTrigger, ModeSelectorContent } from "./ModeSelectorMenu";
import { useGlobalState } from "@/app/contexts/GlobalState";
import { useAuth } from "@workos-inc/authkit-nextjs/components";
import { toast } from "sonner";


export interface ChatModeSelectorProps {
  className?: string;
}

export function ChatModeSelector({ className }: ChatModeSelectorProps) {
  const {
    chatMode,
    setChatMode,
    temporaryChatsEnabled,
  } = useGlobalState();
  const { user } = useAuth();

  const handleAgentModeClick = () => {
    if (!user) {
      window.location.href = "/signup";
      return;
    }
    if (temporaryChatsEnabled) {
      toast.info("Agent mode requires chat history", {
        description: "Turn off temporary chat to use Agent mode.",
      });
      return;
    }
    setChatMode("agent");
  };

  return (
    <div
      className={`flex items-center gap-1.5 min-w-0 overflow-hidden ${className ?? ""}`}
    >
      <DropdownMenu>
        <ModeSelectorTrigger chatMode={chatMode} />
        <ModeSelectorContent
          setChatMode={setChatMode}
          onAgentModeClick={handleAgentModeClick}
          temporaryChatsEnabled={temporaryChatsEnabled}
        />
      </DropdownMenu>
    </div>
  );
}
