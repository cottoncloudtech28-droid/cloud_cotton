"use client";

import { Button } from "@/components/ui/button";
import { Bold, List } from "lucide-react";

export function applyBold(value: string, start: number, end: number) {
  if (start === end) {
    const insertion = "bold text";
    const newValue = value.slice(0, start) + `**${insertion}**` + value.slice(end);
    return { value: newValue, selStart: start + 2, selEnd: start + 2 + insertion.length };
  }
  const selected = value.slice(start, end);
  const newValue = value.slice(0, start) + `**${selected}**` + value.slice(end);
  return { value: newValue, selStart: start + 2, selEnd: end + 2 };
}

// Toggles a "- " bullet prefix on every line touched by the current selection
// (or just the current line, if nothing is selected). Blank lines are left alone.
export function applyBullet(value: string, start: number, end: number) {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const nextBreak = value.indexOf("\n", end);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;
  const block = value.slice(lineStart, lineEnd);
  const lines = block.split("\n");
  const contentLines = lines.filter((l) => l.trim() !== "");
  const allBulleted = contentLines.length > 0 && contentLines.every((l) => /^\s*-\s/.test(l));
  const newLines = lines.map((l) => {
    if (l.trim() === "") return l;
    if (allBulleted) return l.replace(/^(\s*)-\s?/, "$1");
    return /^\s*-\s/.test(l) ? l : `- ${l}`;
  });
  const newBlock = newLines.join("\n");
  const newValue = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
  const delta = newBlock.length - block.length;
  return { value: newValue, selStart: start, selEnd: Math.max(start, end + delta) };
}

export function DescriptionToolbar({
  textareaRef, value, onChange,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (v: string) => void;
}) {
  const run = (fn: typeof applyBold) => {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd } = el;
    const result = fn(value, selectionStart, selectionEnd);
    onChange(result.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.selStart, result.selEnd);
    });
  };
  return (
    <div className="flex gap-1.5">
      <Button type="button" variant="outline" size="sm" className="h-7 px-2.5"
        title="Bold selected text" onClick={() => run(applyBold)}>
        <Bold className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant="outline" size="sm" className="h-7 px-2.5"
        title="Bullet list" onClick={() => run(applyBullet)}>
        <List className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
