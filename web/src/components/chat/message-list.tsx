"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";
import { HEISENBERG, REACTION_EMOJI } from "@/lib/constants";
import type { ChatMessage } from "@/components/chat/types";

export function MessageList({
  messages,
  meId,
  loading,
  onReact,
  onOpenThread,
  emptyLabel,
  compact,
}: {
  messages: ChatMessage[];
  meId: string;
  loading: boolean;
  onReact: (id: string, emoji: string) => void;
  onOpenThread?: (m: ChatMessage) => void;
  emptyLabel?: string;
  compact?: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (loading) {
    return (
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="h-9 w-9 animate-pulse rounded-full bg-[var(--surface-2)]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 animate-pulse rounded bg-[var(--surface-2)]" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--surface-2)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!messages.length) {
    return <div className="flex flex-1 items-center justify-center p-8 text-sm text-[var(--muted)]">{emptyLabel ?? "No messages yet."}</div>;
  }

  return (
    <div className={cn("flex-1 overflow-y-auto", compact ? "px-4 py-2" : "px-5 py-4")}>
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const grouped =
          prev &&
          prev.authorName === m.authorName &&
          prev.authorKind === m.authorKind &&
          new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000;
        return <MessageRow key={m.id} m={m} grouped={!!grouped} meId={meId} onReact={onReact} onOpenThread={onOpenThread} />;
      })}
      <div ref={bottomRef} />
    </div>
  );
}

function MessageRow({
  m,
  grouped,
  meId,
  onReact,
  onOpenThread,
}: {
  m: ChatMessage;
  grouped: boolean;
  meId: string;
  onReact: (id: string, emoji: string) => void;
  onOpenThread?: (m: ChatMessage) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const isAi = m.authorKind === "ASSISTANT";
  const time = new Date(m.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div className={cn("group relative flex gap-3 rounded-[var(--radius-input)] px-2 -mx-2 hover:bg-[var(--surface)]", grouped ? "py-0.5" : "pt-3 pb-0.5")}>
      <div className="w-9 shrink-0">
        {!grouped &&
          (isAi ? (
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white" style={{ backgroundColor: HEISENBERG.color }} title={HEISENBERG.name}>
              <BotGlyph />
            </span>
          ) : (
            <Avatar name={m.authorName} color={m.authorColor} size={36} />
          ))}
      </div>
      <div className="min-w-0 flex-1">
        {!grouped && (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold">{m.authorName}</span>
            {isAi && <span className="rounded-full bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)]">AI</span>}
            <span className="text-xs text-[var(--muted)]">{time}</span>
          </div>
        )}
        <div className={cn("text-sm leading-relaxed", isAi && "rounded-[var(--radius-input)] border-l-2 pl-3", isAi && "border-l-[color:var(--accent)]")}
          style={isAi ? { borderColor: HEISENBERG.color } : undefined}>
          <MessageBody body={m.body} meId={meId} />
        </div>

        {m.reactions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {m.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onReact(m.id, r.emoji)}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                  r.mine ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--border)] hover:bg-[var(--surface-2)]",
                )}
              >
                <span>{r.emoji}</span>
                <span className="text-[var(--muted)]">{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {onOpenThread && m.replyCount > 0 && (
          <button onClick={() => onOpenThread(m)} className="mt-1 text-xs font-medium text-[var(--accent)] hover:underline">
            {m.replyCount} repl{m.replyCount === 1 ? "y" : "ies"}
          </button>
        )}
      </div>

      {/* Hover actions */}
      <div className="absolute -top-3 right-2 hidden items-center gap-0.5 rounded-[var(--radius-input)] border bg-[var(--bg)] p-0.5 shadow-sm group-hover:flex">
        <div className="relative">
          <button onClick={() => setPickerOpen((o) => !o)} className="rounded px-1.5 py-1 text-sm hover:bg-[var(--surface-2)]" title="React">
            😀
          </button>
          {pickerOpen && (
            <div className="absolute right-0 top-8 z-10 flex gap-0.5 rounded-[var(--radius-input)] border bg-[var(--bg)] p-1 shadow-lg">
              {REACTION_EMOJI.map((e) => (
                <button key={e} onClick={() => { onReact(m.id, e); setPickerOpen(false); }} className="rounded px-1 py-0.5 text-base hover:bg-[var(--surface-2)]">
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
        {onOpenThread && (
          <button onClick={() => onOpenThread(m)} className="rounded px-1.5 py-1 text-xs text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]" title="Reply in thread">
            Reply
          </button>
        )}
      </div>
    </div>
  );
}

// Renders body with @mention highlights and a Join button for meeting cards.
function MessageBody({ body, meId }: { body: string; meId: string }) {
  const meetMatch = body.match(/\/meet\/([a-zA-Z0-9]+)/);
  const lines = body.split("\n");
  return (
    <div className="whitespace-pre-wrap break-words">
      {lines.map((line, i) => (
        <div key={i}>{renderInline(line, meId)}</div>
      ))}
      {meetMatch && (
        <Link
          href={`/meet/${meetMatch[1]}`}
          target="_blank"
          className="transition-quiet mt-2 inline-flex items-center gap-2 rounded-[var(--radius-input)] bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent-fg)]"
        >
          Join call
        </Link>
      )}
    </div>
  );
}

function renderInline(text: string, _meId: string) {
  // Bold **x**, then @mentions.
  const parts = text.split(/(\*\*[^*]+\*\*|@[a-z0-9._-]+)/gi);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (/^@[a-z0-9._-]+$/i.test(p)) {
      const isAi = /^@heisenberg$/i.test(p);
      return (
        <span key={i} className={cn("rounded px-1 font-medium", isAi ? "bg-[color:var(--accent)]/15 text-[var(--accent)]" : "bg-[#2F6FEB]/15 text-[#2F6FEB]")}>
          {p}
        </span>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

function BotGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <path d="M12 8V4" />
      <circle cx="9" cy="14" r="1" />
      <circle cx="15" cy="14" r="1" />
      <path d="M2 13v2M22 13v2" />
    </svg>
  );
}
