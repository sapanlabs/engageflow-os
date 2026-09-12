"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function NewNoteButton({
  clientId,
  projectId,
  parentId,
  label = "New note",
}: {
  clientId?: string;
  projectId?: string;
  parentId?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function create() {
    setBusy(true);
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientId, projectId, parentId, title: "Untitled" }),
    });
    setBusy(false);
    if (res.ok) {
      const { data } = await res.json();
      router.push(`/notes/${data.id}`);
    }
  }

  return (
    <Button variant={parentId ? "ghost" : "primary"} onClick={create} disabled={busy}>
      {busy ? "Creating…" : label}
    </Button>
  );
}
