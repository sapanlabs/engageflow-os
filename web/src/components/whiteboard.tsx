"use client";

import { useRef, useState } from "react";

type El = {
  id: string;
  kind: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
};

const PALETTE = ["#FFE066", "#A0E7A0", "#BFD7FF", "#FFB3B3", "#E6D3FF", "#FFFFFF"];

export function Whiteboard({ projectId, initial }: { projectId: string; initial: El[] }) {
  const [els, setEls] = useState<El[]>(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  async function add(kind: string) {
    const res = await fetch("/api/whiteboard", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectId,
        kind,
        x: 60 + Math.random() * 120,
        y: 60 + Math.random() * 120,
        text: kind === "TEXT" ? "Text" : "",
        color: kind === "RECT" ? "#BFD7FF" : "#FFE066",
      }),
    });
    if (res.ok) { const { data } = await res.json(); setEls((e) => [...e, data]); }
  }

  function onPointerDown(e: React.PointerEvent, el: El) {
    if (editing) return;
    const board = boardRef.current!.getBoundingClientRect();
    dragRef.current = { id: el.id, dx: e.clientX - board.left - el.x, dy: e.clientY - board.top - el.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const board = boardRef.current!.getBoundingClientRect();
    const x = Math.max(0, e.clientX - board.left - d.dx);
    const y = Math.max(0, e.clientY - board.top - d.dy);
    setEls((list) => list.map((el) => (el.id === d.id ? { ...el, x, y } : el)));
  }
  async function onPointerUp() {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    const el = els.find((x) => x.id === d.id);
    if (el) await save(el.id, { x: el.x, y: el.y });
  }

  async function save(id: string, patch: Partial<El>) {
    await fetch(`/api/whiteboard/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async function remove(id: string) {
    setEls((e) => e.filter((x) => x.id !== id));
    await fetch(`/api/whiteboard/${id}`, { method: "DELETE" });
  }

  function setText(id: string, text: string) {
    setEls((list) => list.map((el) => (el.id === id ? { ...el, text } : el)));
  }
  function setColor(id: string, color: string) {
    setEls((list) => list.map((el) => (el.id === id ? { ...el, color } : el)));
    save(id, { color });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button onClick={() => add("NOTE")} className="rounded-[var(--radius-input)] border px-3 py-1.5 text-sm hover:bg-[var(--surface-2)]">+ Sticky note</button>
        <button onClick={() => add("TEXT")} className="rounded-[var(--radius-input)] border px-3 py-1.5 text-sm hover:bg-[var(--surface-2)]">+ Text</button>
        <button onClick={() => add("RECT")} className="rounded-[var(--radius-input)] border px-3 py-1.5 text-sm hover:bg-[var(--surface-2)]">+ Frame</button>
        <span className="ml-auto text-xs text-[var(--muted)]">Drag to move · double-click to edit</span>
      </div>

      <div
        ref={boardRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="relative h-[70dvh] min-h-[520px] w-full overflow-hidden rounded-[var(--radius-card)] border"
        style={{
          backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        {els.map((el) => (
          <div
            key={el.id}
            onPointerDown={(e) => onPointerDown(e, el)}
            onDoubleClick={() => setEditing(el.id)}
            className="group absolute touch-none select-none"
            style={{ left: el.x, top: el.y, width: el.width, height: el.kind === "TEXT" ? "auto" : el.height }}
          >
            {el.kind === "TEXT" ? (
              editing === el.id ? (
                <input
                  autoFocus
                  value={el.text}
                  onChange={(e) => setText(el.id, e.target.value)}
                  onBlur={() => { setEditing(null); save(el.id, { text: el.text }); }}
                  className="bg-transparent font-display text-xl outline-none"
                />
              ) : (
                <span className="font-display text-xl" style={{ color: el.color === "#FFFFFF" ? "var(--fg)" : el.color }}>{el.text || "Text"}</span>
              )
            ) : (
              <div
                className="flex h-full w-full flex-col rounded-md p-2 shadow-sm"
                style={{ backgroundColor: el.kind === "RECT" ? "transparent" : el.color, border: el.kind === "RECT" ? `2px solid ${el.color}` : "none" }}
              >
                {editing === el.id ? (
                  <textarea
                    autoFocus
                    value={el.text}
                    onChange={(e) => setText(el.id, e.target.value)}
                    onBlur={() => { setEditing(null); save(el.id, { text: el.text }); }}
                    className="h-full w-full resize-none bg-transparent text-sm outline-none"
                  />
                ) : (
                  <p className="text-sm text-[#1a1a1a]">{el.text || (el.kind === "RECT" ? "Frame" : "Note")}</p>
                )}
              </div>
            )}

            {/* controls */}
            <div className="absolute -top-2 right-0 hidden gap-1 group-hover:flex">
              {PALETTE.map((c) => (
                <button key={c} onClick={() => setColor(el.id, c)} className="h-3.5 w-3.5 rounded-full border" style={{ backgroundColor: c }} aria-label={`color ${c}`} />
              ))}
              <button onClick={() => remove(el.id)} className="ml-1 rounded bg-black/70 px-1 text-[10px] text-white" aria-label="Delete">✕</button>
            </div>
          </div>
        ))}
        {els.length === 0 && (
          <div className="pointer-events-none flex h-full items-center justify-center">
            <p className="text-sm text-[var(--muted)]">Add a sticky note, text, or frame to start planning.</p>
          </div>
        )}
      </div>
    </div>
  );
}
