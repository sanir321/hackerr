"use client";

import { memo, useCallback, useState } from "react";
import { CheckCircle2 } from "lucide-react";

interface AskUserHandlerProps {
  input?: {
    question?: string;
    options?: string[];
  };
  output?: {
    question?: string;
    options?: string[];
    message?: string;
  };
  state?: string;
}

export const AskUserHandler = memo(function AskUserHandler({
  input,
  output,
  state,
}: AskUserHandlerProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const question = input?.question ?? output?.question ?? "A question was asked";
  const options = input?.options ?? output?.options ?? [];

  const handleSelect = useCallback(
    (option: string) => {
      if (answered) return;
      setSelectedOption(option);
      setAnswered(true);
      // Dispatch event so chat.tsx can send this as the next message
      window.dispatchEvent(
        new CustomEvent("ask-user-select", { detail: option }),
      );
    },
    [answered],
  );

  if (state === "call") {
    return (
      <div className="border rounded-lg p-3 my-1 bg-muted/30">
        <p className="text-sm font-medium mb-2">{question}</p>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              className="text-sm px-3 py-1.5 rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-3 my-1 bg-muted/30">
      <p className="text-sm font-medium mb-2">{question}</p>
      {answered && selectedOption ? (
        <div className="flex items-center gap-2 text-sm text-primary">
          <CheckCircle2 className="w-4 h-4" />
          <span>{selectedOption}</span>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              className="text-sm px-3 py-1.5 rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
