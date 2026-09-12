"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui";

type Person = { id: string; name: string; avatarColor: string };
type Task = {
  id: string;
  title: string;
  status: string;
  assigneeId?: string | null;
  assignee?: { name: string; avatarColor: string } | null;
};

const COLUMNS = [
  { key: "TODO", label: "To do" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "REVIEW", label: "Review" },
  { key: "DONE", label: "Done" },
];

export function Kanban({
  projectId,
  initial,
  assignees,
}: {
  projectId: string;
  initial: Task[];
  assignees: Person[];
}) {
  const [tasks, setTasks] = useState<Task[]>(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [draftAssignee, setDraftAssignee] = useState("");

  function personById(id?: string | null) {
    return assignees.find((a) => a.id === id) ?? null;
  }

  async function move(id: string, status: string) {
    const prev = tasks;
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, status } : x)));
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) setTasks(prev);
  }

  async function reassign(id: string, assigneeId: string) {
    const p = personById(assigneeId);
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, assigneeId: assigneeId || null, assignee: p ? { name: p.name, avatarColor: p.avatarColor } : null } : x)));
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assigneeId: assigneeId || null }),
    });
  }

  async function add(status: string) {
    if (!draft.trim()) { setAdding(null); return; }
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId, title: draft.trim(), status, assigneeId: draftAssignee || null }),
    });
    if (res.ok) {
      const { data } = await res.json();
      setTasks((t) => [...t, { ...data, assignee: data.assignee ? { name: data.assignee.name, avatarColor: data.assignee.avatarColor } : null }]);
    }
    setDraft(""); setDraftAssignee(""); setAdding(null);
  }

  async function remove(id: string) {
    const prev = tasks;
    setTasks((t) => t.filter((x) => x.id !== id));
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (!res.ok) setTasks(prev);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((col) => {
        const items = tasks.filter((t) => t.status === col.key);
        return (
          <div
            key={col.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragId) { move(dragId, col.key); setDragId(null); } }}
            className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-[var(--surface)] p-3"
          >
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-medium">{col.label}</span>
              <span className="text-xs text-[var(--muted)]">{items.length}</span>
            </div>

            {items.map((t) => (
              <div
                key={t.id}
                draggable
                onDragStart={() => setDragId(t.id)}
                className="group cursor-grab rounded-[var(--radius-input)] border bg-[var(--bg)] p-3 active:cursor-grabbing"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm">{t.title}</p>
                  <button
                    onClick={() => remove(t.id)}
                    className="text-xs text-[var(--muted)] opacity-0 transition group-hover:opacity-100 hover:text-[#C0442E]"
                    aria-label="Delete task"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {t.assignee && <Avatar name={t.assignee.name} color={t.assignee.avatarColor} size={18} />}
                  <select
                    value={t.assigneeId ?? ""}
                    onChange={(e) => reassign(t.id, e.target.value)}
                    className="rounded-[6px] border bg-[var(--bg)] px-1.5 py-0.5 text-xs text-[var(--muted)] outline-none"
                    aria-label="Assignee"
                  >
                    <option value="">Unassigned</option>
                    {assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
            ))}

            {adding === col.key ? (
              <div className="flex flex-col gap-2 rounded-[var(--radius-input)] border bg-[var(--bg)] p-2">
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") add(col.key); if (e.key === "Escape") { setAdding(null); setDraft(""); } }}
                  placeholder="Task title…"
                  className="rounded-[6px] border bg-[var(--bg)] px-2 py-1.5 text-sm outline-none focus:border-[var(--fg)]/40"
                />
                <select value={draftAssignee} onChange={(e) => setDraftAssignee(e.target.value)}
                  className="rounded-[6px] border bg-[var(--bg)] px-2 py-1.5 text-xs text-[var(--muted)] outline-none">
                  <option value="">Unassigned</option>
                  {assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setAdding(null); setDraft(""); }} className="text-xs text-[var(--muted)] hover:text-[var(--fg)]">Cancel</button>
                  <button onClick={() => add(col.key)} className="rounded-[6px] bg-[var(--accent)] px-2 py-1 text-xs font-medium text-[var(--accent-fg)]">Add</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setAdding(col.key); setDraft(""); setDraftAssignee(""); }}
                className="rounded-[var(--radius-input)] px-3 py-2 text-left text-sm text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
              >
                + Add task
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
