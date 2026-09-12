"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Admin action to archive media untouched for >7 days now (production runs this
// on a schedule/cron instead).
export function ArchiveSweepButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function run() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/assets/archive-stale", { method: "POST" });
    setBusy(false);
    if (res.ok) {
      const { data } = await res.json();
      setMsg(`Archived ${data.archived} file${data.archived === 1 ? "" : "s"}`);
      router.refresh();
      setTimeout(() => setMsg(null), 3000);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-[var(--muted)]">{msg}</span>}
      <button
        onClick={run}
        disabled={busy}
        className="transition-quiet rounded-[var(--radius-input)] border px-3 py-1.5 text-sm text-[var(--muted)] hover:text-[var(--fg)] disabled:opacity-60"
        title="Archive media untouched for over 7 days"
      >
        {busy ? "Archiving…" : "Free up space"}
      </button>
    </div>
  );
}
