"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { HEISENBERG } from "@/lib/constants";
import type { Member } from "@/components/chat/types";

// Turn a member/name into an @handle token (first name, lowercased).
function handleFor(m: Member): string {
  if (m.kind === "ASSISTANT") return HEISENBERG.handle;
  return m.name.split(" ")[0].toLowerCase();
}

export function MessageComposer({
  placeholder,
  members,
  heisenbergEnabled,
  onSend,
}: {
  placeholder: string;
  members: Member[];
  heisenbergEnabled: boolean;
  onSend: (body: string) => void | Promise<unknown>;
}) {
  const [value, setValue] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  const suggestions =
    mentionQuery === null
      ? []
      : members
          .filter((m) => m.kind === "USER" || heisenbergEnabled)
          .filter((m) => handleFor(m).startsWith(mentionQuery.toLowerCase()) || m.name.toLowerCase().includes(mentionQuery.toLowerCase()))
          .slice(0, 6);

  function onChange(v: string) {
    setValue(v);
    const caret = ref.current?.selectionStart ?? v.length;
    const upto = v.slice(0, caret);
    const match = upto.match(/(?:^|\s)@([a-z0-9._-]*)$/i);
    setMentionQuery(match ? match[1] : null);
  }

  function applyMention(m: Member) {
    const caret = ref.current?.selectionStart ?? value.length;
    const upto = value.slice(0, caret);
    const rest = value.slice(caret);
    const replaced = upto.replace(/@([a-z0-9._-]*)$/i, `@${handleFor(m)} `);
    setValue(replaced + rest);
    setMentionQuery(null);
    ref.current?.focus();
  }

  function submit() {
    const body = value.trim();
    if (!body) return;
    onSend(body);
    setValue("");
    setMentionQuery(null);
  }

  return (
    <div className="relative shrink-0 border-t p-3">
      {suggestions.length > 0 && (
        <div className="absolute bottom-full left-3 mb-1 w-64 overflow-hidden rounded-[var(--radius-input)] border bg-[var(--bg)] shadow-lg">
          {suggestions.map((m) => (
            <button
              key={m.id}
              onMouseDown={(e) => {
                e.preventDefault();
                applyMention(m);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-[var(--surface-2)]"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium text-white" style={{ backgroundColor: m.color }}>
                {m.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
              </span>
              <span className="font-medium">@{handleFor(m)}</span>
              <span className="text-xs text-[var(--muted)]">{m.name}</span>
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2 rounded-[var(--radius-input)] border bg-[var(--bg)] px-3 py-2 focus-within:border-[var(--fg)]/40">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !mentionQuery) {
              e.preventDefault();
              submit();
            }
            if (e.key === "Enter" && suggestions.length && mentionQuery !== null) {
              e.preventDefault();
              applyMention(suggestions[0]);
            }
            if (e.key === "Escape") setMentionQuery(null);
          }}
          rows={1}
          placeholder={placeholder}
          className="max-h-40 min-h-[24px] flex-1 resize-none bg-transparent text-sm outline-none"
          style={{ height: "auto" }}
        />
        {heisenbergEnabled && (
          <button
            onClick={() => onChange((value ? value + " " : "") + "@heisenberg ")}
            className="transition-quiet shrink-0 rounded-[var(--radius-input)] px-2 py-1 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
            title="Ask Heisenberg"
          >
            @ Ask AI
          </button>
        )}
        <button
          onClick={submit}
          disabled={!value.trim()}
          className={cn(
            "transition-quiet shrink-0 rounded-[var(--radius-input)] px-3 py-1.5 text-sm font-medium",
            value.trim() ? "bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90" : "bg-[var(--surface-2)] text-[var(--muted)]",
          )}
        >
          Send
        </button>
      </div>
      <p className="mt-1 px-1 text-[11px] text-[var(--muted)]">
        Enter to send · Shift+Enter for a new line · type @ to mention {heisenbergEnabled ? "or tag @heisenberg" : ""}
      </p>
    </div>
  );
}
