"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { MeetIcon } from "@/components/icons";
import { MessageList } from "@/components/chat/message-list";
import { MessageComposer } from "@/components/chat/composer";
import type { ChannelDetail, ChatMessage } from "@/components/chat/types";

// A single-channel conversation (no channel rail). Used inside the project Chat
// tab. Shares the same message list, composer, reactions, threads, and calls as
// the global chat hub, so the experience is identical.
export function ChannelPane({ channelId, meId, heightClass }: { channelId: string; meId: string; heightClass?: string }) {
  const [detail, setDetail] = useState<ChannelDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thread, setThread] = useState<ChatMessage | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMessages = useCallback(async () => {
    const m = await fetch(`/api/chat/channels/${channelId}/messages`).then((r) => (r.ok ? r.json() : null));
    setMessages(m?.data ?? []);
  }, [channelId]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const d = await fetch(`/api/chat/channels/${channelId}`).then((r) => (r.ok ? r.json() : null));
      if (!alive) return;
      setDetail(d?.data ?? null);
      await loadMessages();
      setLoading(false);
      fetch(`/api/chat/channels/${channelId}/read`, { method: "POST" });
    })();
    return () => {
      alive = false;
    };
  }, [channelId, loadMessages]);

  useEffect(() => {
    const es = new EventSource("/api/chat/stream");
    es.onmessage = (ev) => {
      try {
        const e = JSON.parse(ev.data);
        if (e.channelId !== channelId) return;
        if (e.type === "message.new" && e.message) {
          const msg = e.message as ChatMessage;
          if (msg.parentId) setMessages((prev) => prev.map((m) => (m.id === msg.parentId ? { ...m, replyCount: m.replyCount + 1 } : m)));
          else setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        } else if (e.type === "reaction.update") {
          setMessages((prev) => prev.map((m) => (m.id === e.messageId ? { ...m, reactions: e.reactions ?? [] } : m)));
        }
      } catch {
        /* noop */
      }
    };
    return () => es.close();
  }, [channelId]);

  async function send(body: string, parentId?: string | null) {
    const res = await fetch(`/api/chat/channels/${channelId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body, parentId: parentId ?? null }),
    });
    if (res.ok && !parentId) {
      const { data } = await res.json();
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
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
    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channelId, title: detail ? `#${detail.name} call` : "Call" }),
    });
    if (res.ok) {
      const { data } = await res.json();
      window.open(`/meet/${data.id}`, "_blank");
    }
  }

  return (
    <div className={`flex ${heightClass ?? "h-[calc(100dvh-19rem)] min-h-[440px]"} overflow-hidden rounded-[var(--radius-card)] border`}>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
          <span className="font-medium">#{detail?.name ?? "…"}</span>
          {detail?.topic && <span className="truncate text-xs text-[var(--muted)]">{detail.topic}</span>}
          <Button variant="secondary" onClick={startCall} className="ml-auto gap-1.5 px-3 py-1.5">
            <MeetIcon size={16} /> Call
          </Button>
        </header>
        <MessageList
          messages={messages}
          meId={meId}
          loading={loading}
          onReact={react}
          onOpenThread={(m) => setThread(m)}
          emptyLabel={detail ? `This is the start of #${detail.name}.` : "Loading…"}
        />
        {detail && (
          <MessageComposer
            placeholder={`Message #${detail.name}`}
            members={detail.members}
            heisenbergEnabled={detail.heisenbergEnabled}
            onSend={(b) => send(b)}
          />
        )}
      </div>

      {thread && detail && (
        <div className="flex w-80 shrink-0 flex-col border-l bg-[var(--surface)]">
          <header className="flex h-12 items-center justify-between border-b px-4">
            <span className="font-medium">Thread</span>
            <button onClick={() => setThread(null)} className="text-sm text-[var(--muted)] hover:text-[var(--fg)]">✕</button>
          </header>
          <ThreadReplies channelId={channelId} parent={thread} meId={meId} onReact={react} />
          <MessageComposer placeholder="Reply…" members={detail.members} heisenbergEnabled={detail.heisenbergEnabled} onSend={(b) => send(b, thread.id)} />
        </div>
      )}
    </div>
  );
}

function ThreadReplies({ channelId, parent, meId, onReact }: { channelId: string; parent: ChatMessage; meId: string; onReact: (id: string, emoji: string) => void }) {
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
        if ((e.type === "message.new" && e.message?.parentId === parent.id) || e.type === "reaction.update") load();
      } catch {
        /* noop */
      }
    };
    return () => es.close();
  }, [load, parent.id]);
  return (
    <div className="flex-1 overflow-y-auto">
      <MessageList messages={[parent]} meId={meId} loading={false} onReact={onReact} compact />
      <div className="border-t px-4 py-1.5 text-xs text-[var(--muted)]">{replies.length} repl{replies.length === 1 ? "y" : "ies"}</div>
      <MessageList messages={replies} meId={meId} loading={false} onReact={onReact} compact emptyLabel="No replies yet." />
    </div>
  );
}
