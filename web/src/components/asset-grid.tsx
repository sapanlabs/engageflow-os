"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { formatDate } from "@/lib/utils";

type Asset = {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  kind: string;
  size: number;
  status: string;
  posterUrl: string | null;
  createdAt: string;
  archivedAt: string | null;
};

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AssetGrid({ assets: initial }: { assets: Asset[] }) {
  const [assets, setAssets] = useState(initial);
  const [restoring, setRestoring] = useState<string | null>(null);
  const router = useRouter();

  async function restore(id: string) {
    setRestoring(id);
    setAssets((a) => a.map((x) => (x.id === id ? { ...x, status: "restoring" } : x)));
    const res = await fetch(`/api/assets/${id}/restore`, { method: "POST" });
    setRestoring(null);
    if (res.ok) {
      setAssets((a) => a.map((x) => (x.id === id ? { ...x, status: "ready" } : x)));
      router.refresh();
    } else {
      setAssets((a) => a.map((x) => (x.id === id ? { ...x, status: "archived" } : x)));
    }
  }

  if (assets.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {assets.map((a) => {
        const isArchived = a.status === "archived" || a.status === "restoring";
        const isImage = a.kind === "image" || a.mimeType.startsWith("image/");
        return (
          <Card key={a.id} className="overflow-hidden">
            {isArchived ? (
              <div className="relative flex aspect-square w-full flex-col items-center justify-center gap-2 bg-[var(--surface-2)] p-4 text-center">
                {a.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.posterUrl} alt={a.name} className="absolute inset-0 h-full w-full object-cover opacity-20 blur-sm" />
                ) : null}
                <span className="relative font-display text-lg">Archived</span>
                <p className="relative text-xs text-[var(--muted)]">Compressed to save storage</p>
                <button
                  onClick={() => restore(a.id)}
                  disabled={a.status === "restoring"}
                  className="relative mt-1 rounded-[var(--radius-input)] bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent-fg)] disabled:opacity-60"
                >
                  {a.status === "restoring" ? "Restoring…" : "Request to view"}
                </button>
              </div>
            ) : (
              <a href={a.url} target="_blank" rel="noreferrer" className="transition-quiet block hover:opacity-90">
                {isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.url} alt={a.name} className="aspect-square w-full object-cover" />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-[var(--surface-2)]">
                    <span className="font-display text-3xl uppercase text-[var(--muted)]">
                      {a.mimeType.includes("pdf") ? "PDF" : a.mimeType.split("/")[1] ?? "FILE"}
                    </span>
                  </div>
                )}
              </a>
            )}
            <div className="p-3">
              <p className="truncate text-sm font-medium">{a.name}</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {isArchived ? "Archived" : fileSize(a.size)} · {formatDate(a.createdAt)}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
