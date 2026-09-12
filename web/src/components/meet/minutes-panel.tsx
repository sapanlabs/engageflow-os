"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import type { TranscriptLine } from "@/components/meet/types";

export function MinutesPanel({
  meetingId,
  transcript,
  minutes,
  onMinutes,
}: {
  meetingId: string;
  transcript: TranscriptLine[];
  minutes: string | null;
  onMinutes: (m: string) => void;
}) {
  const [tab, setTab] = useState<"transcript" | "minutes">("transcript");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tab === "transcript") endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript.length, tab]);

  useEffect(() => {
    if (minutes) setTab("minutes");
  }, [minutes]);

  async function generate() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/meetings/${meetingId}/minutes`, { method: "POST" });
    setBusy(false);
    if (res.ok) {
      const { data } = await res.json();
      onMinutes(data.minutes);
      setTab("minutes");
    } else {
      const j = await res.json().catch(() => ({}));
      setError(
        j.code === "DISABLED" || j.code === "FEATURE_OFF"
          ? "Heisenberg is off. An admin can enable AI in Settings → AI."
          : j.code === "NO_KEY"
            ? "Add an AI key in Settings → AI to let Heisenberg write minutes."
            : j.error ?? "Could not generate minutes.",
      );
    }
  }

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l bg-[var(--surface)]">
      <div className="flex shrink-0 items-center gap-1 border-b p-2">
        <TabButton active={tab === "transcript"} onClick={() => setTab("transcript")}>
          Transcript {transcript.length > 0 && <span className="text-[var(--muted)]">· {transcript.length}</span>}
        </TabButton>
        <TabButton active={tab === "minutes"} onClick={() => setTab("minutes")}>
          Minutes
        </TabButton>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "transcript" ? (
          transcript.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Live captions appear here as people speak. Heisenberg turns them into minutes when you're done.
            </p>
          ) : (
            <div className="space-y-2.5">
              {transcript.map((l, i) => (
                <div key={i} className="text-sm">
                  <span className="font-medium">{l.speaker}</span>
                  <span className="ml-2 text-xs text-[var(--muted)]">
                    {new Date(l.ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <p className="text-[var(--fg)]">{l.text}</p>
                </div>
              ))}
              <div ref={endRef} />
            </div>
          )
        ) : minutes ? (
          <div className="prose-minutes whitespace-pre-wrap text-sm leading-relaxed">{minutes}</div>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            No minutes yet. When the conversation has some transcript, generate a summary with decisions and action
            items.
          </p>
        )}
      </div>

      <div className="shrink-0 border-t p-3">
        {error && <p className="mb-2 text-xs text-[#C0442E]">{error}</p>}
        <Button onClick={generate} disabled={busy || transcript.length === 0} className="w-full">
          {busy ? "Heisenberg is writing…" : minutes ? "Regenerate minutes" : "✨ Generate minutes"}
        </Button>
        <p className="mt-1.5 text-center text-[11px] text-[var(--muted)]">Minutes are posted to the linked channel too.</p>
      </div>
    </aside>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        "flex-1 rounded-[var(--radius-input)] px-3 py-1.5 text-sm font-medium transition-colors " +
        (active ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "text-[var(--muted)] hover:text-[var(--fg)]")
      }
    >
      {children}
    </button>
  );
}
