"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type TeamMember = { id: string; name: string; avatarColor: string; role: string };

export function NewChannelModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/chat/members")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setTeam(j.data))
      .catch(() => {});
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/chat/channels", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        topic: topic.trim() || undefined,
        isPrivate,
        memberIds: [...selected],
      }),
    });
    setBusy(false);
    if (res.ok) {
      const { data } = await res.json();
      onCreated(data.id);
    } else {
      setError((await res.json().catch(() => ({}))).error ?? "Could not create channel");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-[var(--radius-card)] border bg-[var(--bg)]" onClick={(e) => e.stopPropagation()}>
        <div className="overflow-y-auto p-6">
          <p className="font-display text-2xl">New group</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Create a channel around anyone you like — a topic, a squad, or a one-off. Independent of projects.</p>

          <label className="mt-5 block text-sm font-medium">Name</label>
          <div className="mt-1 flex items-center rounded-[var(--radius-input)] border bg-[var(--bg)] px-3 focus-within:border-[var(--fg)]/40">
            <span className="text-[var(--muted)]">#</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="design-guild"
              className="w-full bg-transparent px-1.5 py-2 text-sm outline-none"
            />
          </div>

          <label className="mt-4 block text-sm font-medium">Topic <span className="text-[var(--muted)]">(optional)</span></label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What's this group about?"
            className="mt-1 w-full rounded-[var(--radius-input)] border bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--fg)]/40"
          />

          <div className="mt-4 flex items-center justify-between">
            <label className="block text-sm font-medium">Members</label>
            {selected.size > 0 && <span className="text-xs text-[var(--muted)]">{selected.size} selected</span>}
          </div>
          <div className="mt-1 max-h-52 overflow-y-auto rounded-[var(--radius-input)] border">
            {team.length === 0 ? (
              <p className="px-3 py-3 text-sm text-[var(--muted)]">Loading team…</p>
            ) : (
              team.map((m) => {
                const on = selected.has(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggle(m.id)}
                    className={cn(
                      "flex w-full items-center gap-3 border-b px-3 py-2 text-left last:border-b-0 transition-colors",
                      on ? "bg-[var(--accent)]/8" : "hover:bg-[var(--surface-2)]",
                    )}
                  >
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-medium text-white" style={{ backgroundColor: m.avatarColor }}>
                      {m.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{m.name}</span>
                      <span className="block truncate text-xs text-[var(--muted)]">{ROLE_LABELS[m.role] ?? m.role}</span>
                    </span>
                    <span className={cn("flex h-4 w-4 items-center justify-center rounded border text-[10px]", on ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]" : "border-[var(--border)]")}>
                      {on ? "✓" : ""}
                    </span>
                  </button>
                );
              })
            )}
          </div>
          <p className="mt-1.5 text-xs text-[var(--muted)]">You're added automatically. Leave everyone unchecked for a workspace-wide channel.</p>

          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
            Private — only the members above can see it
          </label>

          {error && <p className="mt-3 text-sm text-[#C0442E]">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t p-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={create} disabled={busy || !name.trim()}>{busy ? "Creating…" : "Create group"}</Button>
        </div>
      </div>
    </div>
  );
}
