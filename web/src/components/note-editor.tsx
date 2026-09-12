"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Lightweight markdown renderer (headings, bold, lists, line breaks).
function renderMarkdown(src: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = src.split("\n");
  const out: string[] = [];
  let inList = false;
  for (const raw of lines) {
    const line = esc(raw);
    if (/^#\s+/.test(line)) { if (inList) { out.push("</ul>"); inList = false; } out.push(`<h2 class="font-display text-2xl mt-4 mb-1">${line.replace(/^#\s+/, "")}</h2>`); }
    else if (/^##\s+/.test(line)) { if (inList) { out.push("</ul>"); inList = false; } out.push(`<h3 class="text-lg font-semibold mt-3 mb-1">${line.replace(/^##\s+/, "")}</h3>`); }
    else if (/^[-*]\s+/.test(line)) { if (!inList) { out.push('<ul class="list-disc pl-5 my-1">'); inList = true; } out.push(`<li>${inline(line.replace(/^[-*]\s+/, ""))}</li>`); }
    else if (line.trim() === "") { if (inList) { out.push("</ul>"); inList = false; } }
    else { if (inList) { out.push("</ul>"); inList = false; } out.push(`<p class="my-1">${inline(line)}</p>`); }
  }
  if (inList) out.push("</ul>");
  return out.join("");
  function inline(s: string) {
    return s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`(.+?)`/g, '<code class="rounded bg-[var(--surface-2)] px-1">$1</code>');
  }
}

export function NoteEditor({
  id,
  initialTitle,
  initialBody,
}: {
  id: string;
  initialTitle: string;
  initialBody: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  function scheduleSave(next: { title?: string; body?: string }) {
    setSaved("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      if (res.ok) { setSaved("saved"); router.refresh(); }
    }, 600);
  }

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <input
          value={title}
          onChange={(e) => { setTitle(e.target.value); scheduleSave({ title: e.target.value }); }}
          className="font-display w-full bg-transparent text-3xl outline-none"
          placeholder="Untitled"
        />
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-xs text-[var(--muted)]">
            {saved === "saving" ? "Saving…" : saved === "saved" ? "Saved" : ""}
          </span>
          <button onClick={() => setPreview((p) => !p)} className="rounded-[var(--radius-input)] border px-3 py-1.5 text-sm hover:bg-[var(--surface-2)]">
            {preview ? "Edit" : "Preview"}
          </button>
        </div>
      </div>
      {preview ? (
        <div className="min-h-64 rounded-[var(--radius-card)] border p-4 text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
      ) : (
        <textarea
          value={body}
          onChange={(e) => { setBody(e.target.value); scheduleSave({ body: e.target.value }); }}
          rows={16}
          placeholder="Write your brief, script, or notes… Markdown supported (#, ##, -, **bold**)."
          className="min-h-64 w-full rounded-[var(--radius-card)] border bg-[var(--bg)] p-4 font-mono text-sm outline-none focus:border-[var(--fg)]/40"
        />
      )}
    </div>
  );
}
