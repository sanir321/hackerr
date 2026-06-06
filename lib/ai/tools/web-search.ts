import { tool } from "ai";
import { z } from "zod";
import type { ToolContext } from "@/types";

interface SearchResult {
  title: string;
  url: string;
  content: string;
}

function parseDdgHtml(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  const seenUrls = new Set<string>();

  const resultBlocks = html.split(/<div[^>]*class="[^"]*result[^"]*"[^>]*>/i);
  for (let i = 1; i < resultBlocks.length; i++) {
    const block = resultBlocks[i];
    const linkMatch = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    const snippetMatch = block.match(/<a[^>]*class="result__snippet"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    if (linkMatch && !seenUrls.has(linkMatch[1])) {
      seenUrls.add(linkMatch[1]);
      results.push({
        title: linkMatch[2].replace(/<[^>]+>/g, "").trim(),
        url: linkMatch[1],
        content: snippetMatch ? snippetMatch[2].replace(/<[^>]+>/g, "").trim() : "",
      });
    }
  }

  return results;
}

export const createWebSearch = (_context: ToolContext) => {
  return tool({
    description: `Search for information across various sources.

<instructions>
- Use this tool to access up-to-date or external information when needed
- For complex searches, break down into step-by-step searches
- Access multiple URLs from search results for comprehensive information
- Use Google dork syntax (site:, filetype:, inurl:, intitle:, etc.) for targeted searches
</instructions>`,
    inputSchema: z.object({
      query: z.string().describe("The search query"),
      brief: z
        .string()
        .describe("A one-sentence preamble describing the purpose of this operation"),
    }),
    execute: async (
      { query }: { brief: string; query: string },
      { abortSignal },
    ) => {
      try {
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; Umbraa/1.0)",
          },
          signal: abortSignal,
        });

        if (!response.ok) {
          return `Error: HTTP ${response.status} from search provider`;
        }

        const html = await response.text();
        const results = parseDdgHtml(html);

        if (results.length === 0) {
          return "No search results found.";
        }

        return results.slice(0, 10).map((r) =>
          `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.content}`
        ).join("\n\n");
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return "Error: Operation aborted";
        }
        const msg = error instanceof Error ? error.message : "Unknown error";
        return `Error performing web search: ${msg}`;
      }
    },
  });
};
