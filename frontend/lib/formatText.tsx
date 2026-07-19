import React from "react";

// Renders admin-authored product descriptions as lightweight formatted text:
// blank-line-separated paragraphs, "-"/"*"/"•" prefixed lines become a bullet
// list, and **bold** segments render bold in the full foreground (black) color
// instead of the surrounding muted gray.
export function formatDescription(text: string | null | undefined): React.ReactNode {
  if (!text) return null;

  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];
  let paragraphLines: string[] = [];

  const flushList = () => {
    if (!listItems.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc pl-5 space-y-1 my-2 first:mt-0 last:mb-0">
        {listItems.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    blocks.push(
      <p key={`p-${blocks.length}`} className="mb-2 first:mt-0 last:mb-0">
        {paragraphLines.map((line, i) => (
          <React.Fragment key={i}>
            {i > 0 && <br />}
            {renderInline(line)}
          </React.Fragment>
        ))}
      </p>
    );
    paragraphLines = [];
  };

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    const bulletMatch = /^[-*•]\s+(.*)$/.exec(line);
    if (bulletMatch) {
      flushParagraph();
      listItems.push(bulletMatch[1]);
    } else if (line === "") {
      flushList();
      flushParagraph();
    } else {
      flushList();
      paragraphLines.push(line);
    }
  }
  flushList();
  flushParagraph();

  return <>{blocks}</>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const m = /^\*\*([^*]+)\*\*$/.exec(part);
    if (m) return <strong key={i} className="font-bold text-foreground">{m[1]}</strong>;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}
