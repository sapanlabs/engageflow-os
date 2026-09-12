"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Button } from "@/components/ui";
import { cn, timeAgo } from "@/lib/utils";
import { HEISENBERG, REACTION_EMOJI } from "@/lib/constants";
import { MeetIcon } from "@/components/icons";
import { NewChannelModal } from "@/components/chat/new-channel-modal";
import { MessageComposer } from "@/components/chat/composer";
import { MessageList } from "@/components/chat/message-list";
import type { ChannelSummary, ChannelDetail, ChatMessage, Member } from "@/components/chat/types";

export function ChatWorkspace({ activeId, meId }: { activeId?: string; meId: string }) {
  const router = useRouter();
  const [channels, setChannels] = useState<ChannelSummary[]>([]);
  const [detail, setDetail] = useState<ChannelDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thread, setThread] = useState<ChatMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);

  const loadChannels = useCallback(async () => {
    const res = await fetch("/api/chat/channels");
    if (res.ok) setChannels((await res.json()).data);
  }, []);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // If no channel selected, jump to the first one.
  useEffect(() => {
    if (!activeId && channels.length) router.replace(`/chat/${channels[0].id}`);
  }, [activeId, channels, router]);

  // Load the active channel's detail + messages.
  useEffect(() => {
    if (!activeId) return;
    let alive = true;
    setLoading(true);
    setThread(null);
    (async () => {
      const [d, m] = await Promise.all([
        fetch(`/api/chat/channels/${activeId}`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/chat/channels/${activeId}/messages`).then((r) => (r.ok ? r.json() : null)),
      ]);
      if (!alive) return;
      setDetail(d?.data ?? null);
      setMessages(m?.data ?? []);
      setLoading(false);
      fetch(`/api/chat/channels/${activeId}/read`, { method: "POST" }).then(loadChannels);
    })();
    return () => {
      alive = false;
    };
  }, [activeId, loadChannels]);

  // Realtime: one SSE connection for the whole workspace.
  useEffect(() => {
    const es = new EventSource("/api/chat/stream");
    es.onmessage = (ev) => {
      let event: { type: string; channelId?: string; message?: ChatMessage; messageId?: string; reactions?: unknown };
      try {
        event = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (event.type === "message.new" && event.message) {
        const msg = event.message;
        if (msg.channelId === activeId) {
          if (msg.parentId) {
            setThread((t) => (t && t.id === msg.parentId ? t : t)); // replies handled in thread panel via its own fetch
            setMessages((prev) => prev.map((m) => (m.id === msg.parentId ? { ...m, replyCount: m.replyCount + 1 } : m)));
          } else {
            setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          }
        }
        loadChannels();
      } else if (event.type === "reaction.update") {
        setMessages((prev) => prev.map((m) => (m.id === event.messageId ? { ...m, reactions: (event.reactions as ChatMessage["reactions"]) ?? [] } : m)));
      } else if (event.type === "channel.new") {
        loadChannels();
      }
    };
    return () => es.close();
  }, [activeId, loadChannels]);

  async function send(body: string, parentId?: string | null) {
    if (!activeId) return;
    const res = await fetch(`/api/chat/channels/${activeId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body, parentId: parentId ?? null }),
    });
    if (res.ok) {
      const { data } = await res.json();
      if (!parentId) setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
      return data as ChatMessage;
    }
  }

  async function react(messageId: string, emoji: string) {
    const res = await fetch(`/api/chat/messages/${messageId}/reactions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (res.ok) {
      const { data } = await res.json();
      if (data) setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions: data.reactions } : m)));
    }
  }

  async function startCall() {
    if (!activeId) return;
    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channelId: activeId, title: detail ? `#${detail.name} call` : "Call" }),
    });
    if (res.ok) {
      const { data } = await res.json();
      window.open(`/meet/${data.id}`, "_blank");
    }
  }

  const grouped = useMemo(() => {
    const chans = channels.filter((c) => c.kind !== "DM");
    const dms = channels.filter((c) => c.kind === "DM");
    return { chans, dms };
  }, [channels]);

  return (
    <div className="flex h-[calc(100dvh-8rem)] overflow-hidden rounded-[var(--radius-card)] border">
      {/* Channel rail */}
      <aside className="flex w-64 shrink-0 flex-col border-r bg-[var(--surface)]">
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="font-display text-xl">Messages</span>
          <button
            onClick={() => setNewOpen(true)}
            className="transition-quiet rounded-[var(--radius-input)] border px-2 py-1 text-xs text-[var(--muted)] hover:text-[var(--fg)]"
            title="New channel"
          >
            + New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          <RailGroup label="Channels">
            {grouped.chans.map((c) => (
              <ChannelRow key={c.id} c={c} active={c.id === activeId} onClick={() => router.push(`/chat/${c.id}`)} />
            ))}
          </RailGroup>
          {grouped.dms.length > 0 && (
            <RailGroup label="Direct messages">
              {grouped.dms.map((c) => (
                <ChannelRow key={c.id} c={c} active={c.id === activeId} onClick={() => router.push(`/chat/${c.id}`)} />
              ))}
            </RailGroup>
          )}
        </div>
      </aside>

      {/* Conversation */}
      <section className="flex min-w-0 flex-1 flex-col">
        {detail ? (
          <>
            <header className="flex h-14 shrink-0 items-center gap-3 border-b px-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">#{detail.name}</span>
                  {detail.isPrivate && <LockGlyph />}
                </div>
                {detail.topic && <p className="truncate text-xs text-[var(--muted)]">{detail.topic}</p>}
              </div>
              <div className="ml-auto flex items-center gap-3">
                <MemberStack members={detail.members} />
                <Button variant="secondary" onClick={startCall} className="gap-1.5 px-3 py-1.5">
                  <MeetIcon size={16} /> Call
                </Button>
              </div>
            </header>

            <div className="flex min-h-0 flex-1">
              <div className="flex min-w-0 flex-1 flex-col">
                <MessageList
                  messages={messages}
                  meId={meId}
                  loading={loading}
                  onReact={react}
                  onOpenThread={(m) => setThread(m)}
                  emptyLabel={`This is the start of #${detail.name}.`}
                />
                <MessageComposer
                  key={activeId}
                  placeholder={`Message #${detail.name}`}
                  members={detail.members}
                  heisenbergEnabled={detail.heisenbergEnabled}
                  onSend={(b) => send(b)}
                />
              </div>

              {thread && (
                <ThreadPanel
                  parent={thread}
                  channelId={detail.id}
                  meId={meId}
                  members={detail.members}
                  heisenbergEnabled={detail.heisenbergEnabled}
                  onClose={() => setThread(null)}
                  onReact={react}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-[var(--muted)]">
            {channels.length ? "Select a channel" : "Loading…"}
          </div>
        )}
      </section>

      {newOpen && (
        <NewChannelModal
          onClose={() => setNewOpen(false)}
          onCreated={(id) => {
            setNewOpen(false);
            loadChannels().then(() => router.push(`/chat/${id}`));
          }}
        />
      )}
    </div>
  );
}

function RailGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function ChannelRow({ c, active, onClick }: { c: ChannelSummary; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "transition-quiet flex items-center gap-2 rounded-[var(--radius-input)] px-3 py-1.5 text-left text-sm",
        active ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]",
      )}
    >
      <span className="opacity-60">{c.kind === "DM" ? "@" : "#"}</span>
      <span className={cn("truncate", c.unread > 0 && !active && "font-semibold text-[var(--fg)]")}>{c.name}</span>
      {c.unread > 0 && (
        <span className={cn("ml-auto flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold", active ? "bg-[var(--accent-fg)] text-[var(--accent)]" : "bg-[#C0442E] text-white")}>
          {c.unread}
        </span>
      )}
    </button>
  );
}

function MemberStack({ members }: { members: Member[] }) {
  const shown = members.slice(0, 4);
  return (
    <div className="flex -space-x-2">
      {shown.map((m) => (
        <span key={m.id} className="ring-2 ring-[var(--bg)] rounded-full" title={m.name}>
          <Avatar name={m.name} color={m.color} size={24} />
        </span>
      ))}
      {members.length > shown.length && (
        <span className="inline-flex h-6 items-center justify-center rounded-full bg-[var(--surface-2)] px-2 text-[10px] text-[var(--muted)] ring-2 ring-[var(--bg)]">
          +{members.length - shown.length}
        </span>
      )}
    </div>
  );
}

function ThreadPanel({
  parent,
  channelId,
  meId,
  members,
  heisenbergEnabled,
  onClose,
  onReact,
}: {
  parent: ChatMessage;
  channelId: string;
  meId: string;
  members: Member[];
  heisenbergEnabled: boolean;
  onClose: () => void;
  onReact: (id: string, emoji: string) => void;
}) {
  const [replies, setReplies] = useState<ChatMessage[]>([]);
  const load = useCallback(async () => {
    const res = await fetch(`/api/chat/channels/${channelId}/messages?parentId=${parent.id}`);
    if (res.ok) setReplies((await res.json()).data);
  }, [channelId, parent.id]);

  useEffect(() => {
    load();
    const es = new EventSource("/api/chat/stream");
    es.onmessage = (ev) => {
      try {
        const e = JSON.parse(ev.data);
        if (e.type === "message.new" && e.message?.parentId === parent.id) load();
        if (e.type === "reaction.update") load();
      } catch {
        /* noop */
      }
    };
    return () => es.close();
  }, [load, parent.id]);

  async function sendReply(body: string) {
    await fetch(`/api/chat/channels/${channelId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body, parentId: parent.id }),
    });
    load();
  }

  return (
    <div className="flex w-96 shrink-0 flex-col border-l bg-[var(--surface)]">
      <header className="flex h-14 items-center justify-between border-b px-4">
        <span className="font-medium">Thread</span>
        <button onClick={onClose} className="text-sm text-[var(--muted)] hover:text-[var(--fg)]">
          ✕
        </button>
      </header>
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={[parent]} meId={meId} loading={false} onReact={onReact} compact />
        <div className="border-t px-4 py-1.5 text-xs text-[var(--muted)]">{replies.length} repl{replies.length === 1 ? "y" : "ies"}</div>
        <MessageList messages={replies} meId={meId} loading={false} onReact={onReact} compact emptyLabel="No replies yet." />
      </div>
      <MessageComposer placeholder="Reply…" members={members} heisenbergEnabled={heisenbergEnabled} onSend={sendReply} />
    </div>
  );
}

function LockGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--muted)]">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export { HEISENBERG, REACTION_EMOJI, timeAgo };
