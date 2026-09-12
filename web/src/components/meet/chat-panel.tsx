"use client";

import { useEffect, useRef, useState } from "react";
import { SendIcon } from "@/components/meet/icons";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  senderName: string;
  senderSid?: string;
  text: string;
  timestamp: number;
  isLocal: boolean;
};

export function ChatPanel({
  messages,
  onSendMessage,
  onClose,
}: {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <aside className="flex w-80 shrink-0 flex-col rounded-[var(--radius-card)] border bg-[var(--surface)] text-[var(--fg)] shadow-lg">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-medium">In-call messages</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[var(--radius-input)] p-1 text-sm text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
          title="Close chat"
        >
          ✕
        </button>
      </header>

      <div className="border-b bg-[var(--surface-2)]/50 px-4 py-2 text-center text-[11px] leading-tight text-[var(--muted)]">
        Messages can only be seen by people in the call and are deleted when the call ends.
      </div>

      {/* Messages list */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center text-xs text-[var(--muted)]">
            <p className="font-medium text-[var(--fg)]">No messages yet</p>
            <p>Send a message to everyone in this call.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn("flex flex-col gap-1 text-xs", msg.isLocal ? "items-end" : "items-start")}
            >
              <div className="flex items-center gap-1.5 px-0.5 text-[11px] text-[var(--muted)]">
                <span className="font-medium">{msg.isLocal ? "You" : msg.senderName}</span>
                <span>·</span>
                <span>{fmtTime(msg.timestamp)}</span>
              </div>
              <div
                className={cn(
                  "max-w-[85%] break-words rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-sm",
                  msg.isLocal
                    ? "rounded-tr-none bg-[var(--accent)] text-[var(--accent-fg)]"
                    : "rounded-tl-none border bg-[var(--surface-2)] text-[var(--fg)]"
                )}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="border-t bg-[var(--bg)] p-3">
        <div className="flex items-center gap-2 rounded-full border bg-[var(--surface-2)] px-3 py-1.5 focus-within:ring-1 focus-within:ring-[var(--accent)]">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message to everyone"
            className="w-full bg-transparent text-xs text-[var(--fg)] placeholder-[var(--muted)] outline-none"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)] transition hover:opacity-90 disabled:opacity-30"
            title="Send message"
          >
            <SendIcon size={14} />
          </button>
        </div>
      </form>
    </aside>
  );
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
