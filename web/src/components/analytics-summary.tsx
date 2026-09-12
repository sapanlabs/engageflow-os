"use client";

import { useState } from "react";
import { useAiStatus } from "@/components/ai-hooks";

export function AnalyticsSummary() {
  const ai = useAiStatus();
  const [summary, setSummary] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ai?.features.analytics) return null;

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/analytics-summary", { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Failed");
      setSummary(j.data.summary);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[var(--radius-card)] border bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">AI summary</p>
        <button onClick={run} disabled={busy}
          className="transition-quiet rounded-full border bg-[var(--bg)] px-3 py-1 text-xs font-medium hover:bg-[var(--surface-2)] disabled:opacity-50">
          {busy ? "Summarizing…" : summary ? "✨ Regenerate" : "✨ Summarize"}
        </button>
      </div>
      {summary && <p className="mt-3 text-sm leading-relaxed">{summary}</p>}
      {error && <p className="mt-2 text-sm text-[#C0442E]">{error}</p>}
      {!summary && !error && <p className="mt-2 text-sm text-[var(--muted)]">Get a plain-language read on the numbers below.</p>}
    </div>
  );
}
