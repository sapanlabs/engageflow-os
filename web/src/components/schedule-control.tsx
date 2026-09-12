"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function ScheduleControl({
  contentId,
  current,
}: {
  contentId: string;
  current?: string | null;
}) {
  const [value, setValue] = useState(current ? current.slice(0, 16) : "");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function save() {
    if (!value) return;
    setBusy(true);
    const res = await fetch(`/api/content/${contentId}/schedule`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scheduledAt: new Date(value).toISOString() }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="rounded-[var(--radius-input)] border bg-[var(--bg)] px-3 py-1.5 text-sm outline-none focus:border-[var(--fg)]/40"
      />
      <Button variant="secondary" onClick={save} disabled={busy || !value}>
        {busy ? "Scheduling…" : "Schedule"}
      </Button>
    </div>
  );
}
