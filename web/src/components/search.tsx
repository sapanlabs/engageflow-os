"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Result = { type: string; label: string; sub?: string; href: string };

export function SearchTrigger() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="transition-quiet hidden items-center gap-2 rounded-[var(--radius-input)] border px-3 py-1.5 text-sm text-[var(--muted)] hover:text-[var(--fg)] md:flex"
      >
        <span>Search</span>
        <kbd className="rounded border px-1.5 py-0.5 text-[10px]">⌘K</kbd>
      </button>
      {open && <Palette onClose={() => setOpen(false)} />}
    </>
  );
}

function Palette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [active, setActive] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const json = await res.json();
        setResults(json.data);
        setActive(0);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [q]);

  function go(r: Result) {
    router.push(r.href);
    onClose();
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === "Enter" && results[active]) { e.preventDefault(); go(results[active]); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-[var(--radius-card)] border bg-[var(--bg)] shadow-2xl">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder="Search clients, projects, content, notes…"
          className="w-full border-b bg-transparent px-4 py-4 text-sm outline-none"
        />
        <div className="max-h-80 overflow-y-auto">
          {q && results.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-[var(--muted)]">No matches for &ldquo;{q}&rdquo;</p>
          )}
          {results.map((r, i) => (
            <button
              key={r.href}
              onClick={() => go(r)}
              onMouseEnter={() => setActive(i)}
              className={
                "flex w-full items-center justify-between px-4 py-3 text-left text-sm " +
                (i === active ? "bg-[var(--surface-2)]" : "")
              }
            >
              <span>
                <span className="font-medium">{r.label}</span>
                {r.sub && <span className="ml-2 text-xs text-[var(--muted)]">{r.sub}</span>}
              </span>
              <span className="text-xs text-[var(--muted)]">{r.type}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
