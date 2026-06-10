import { tool, zodSchema } from "ai";
import { z } from "zod";
import type { ToolContext } from "@/types";

export const createAskUser = (context: ToolContext) => {
  const { writer } = context;

  return tool({
    description: `Use this tool to ask the user a question when you need their input before proceeding. Present clear options for them to choose from.

### When to Use This Tool

Use BEFORE running terminal commands or taking irreversible actions when:
1. You need to know which target to scan (IP, domain, URL)
2. There are multiple approaches and you want the user to choose
3. You need clarification on scope (which ports, which directories, which parameters)
4. The user's request is ambiguous and you need to confirm intent
5. You need the user to confirm a destructive action

### When NOT to Use

Skip when:
1. The user's request is clear and unambiguous
2. You can determine the answer from context or prior conversation
3. The action is trivial and reversible (e.g., reading a file, listing directories)
4. You already have all the information you need

### Examples

<example>
  User: Scan this target
  Assistant: Calls ask_user with question="What is the target to scan?" options=["Provide IP/hostname", "I'll paste a URL", "Scan localhost"]
</example>

<example>
  User: Run a port scan
  Assistant: Calls ask_user with question="What type of port scan?" options=["Quick scan (top 1000 ports)", "Full scan (all 65535 ports)", "Custom range"]
</example>

<example>
  User: Test for SQL injection
  Assistant: Calls ask_user with question="Do you have a specific login page URL, or should I find it through directory enumeration?" options=["I have a URL - let me provide it", "Find it through enumeration", "Test common login paths"]
</example>`,
    inputSchema: zodSchema(
      z.object({
        question: z.string().describe("The question to ask the user"),
        options: z
          .array(z.string())
          .min(2)
          .max(6)
          .describe("2-6 options for the user to choose from"),
      }),
    ),
    execute: async ({
      question,
      options,
    }: {
      question: string;
      options: string[];
    }) => {
      writer.write({
        type: "data-ask-user",
        data: { question, options },
        transient: true,
      });

      return {
        question,
        options,
        message:
          "Your response will be sent as a regular chat message. Please type your choice or answer.",
      };
    },
  });
};
