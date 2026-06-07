import { memo } from "react";
import { Streamdown } from "streamdown";
import { CodeHighlight } from "./CodeHighlight";
import { MarkdownTable } from "./MarkdownTable";

/** Local file path: starts with / or ~/ */
function isLocalFilePath(href: string | undefined): boolean {
  if (!href) return false;
  return href.startsWith("/") || href.startsWith("~/");
}

interface MemoizedMarkdownProps {
  content: string;
}

export const MemoizedMarkdown = memo(({ content }: MemoizedMarkdownProps) => {
  return (
    <Streamdown
      components={{
        code: CodeHighlight,
        table: MarkdownTable,
        a({ children, href }) {
          // Local file paths: render as plain text on web
          if (isLocalFilePath(href)) {
            return <span className="text-muted-foreground">{children}</span>;
          }
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link hover:text-link/80 hover:underline transition-colors duration-200"
            >
              {children}
            </a>
          );
        },
      }}
    >
      {content}
    </Streamdown>
  );
});

MemoizedMarkdown.displayName = "MemoizedMarkdown";
