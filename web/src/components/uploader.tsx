"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type UploadingFile = { name: string; progress: number; error?: string };

export function Uploader({
  projectId,
  clientId,
}: {
  projectId?: string;
  clientId?: string;
}) {
  const [items, setItems] = useState<UploadingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Streams one file as the raw request body (low memory, huge-file safe) with
  // XHR so we get upload progress.
  function uploadOne(file: File, onProgress: (pct: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const qs = new URLSearchParams();
      if (projectId) qs.set("projectId", projectId);
      if (clientId) qs.set("clientId", clientId);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/upload?${qs.toString()}`);
      xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
      xhr.setRequestHeader("x-filename", encodeURIComponent(file.name));
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else {
          let msg = `Upload failed (${xhr.status})`;
          try { msg = JSON.parse(xhr.responseText).error ?? msg; } catch {}
          reject(new Error(msg));
        }
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(file);
    });
  }

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    const list = Array.from(files);
    setItems(list.map((f) => ({ name: f.name, progress: 0 })));
    for (let i = 0; i < list.length; i++) {
      try {
        await uploadOne(list[i], (pct) =>
          setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, progress: pct } : it))),
        );
        setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, progress: 100 } : it)));
      } catch (e) {
        setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, error: (e as Error).message } : it)));
      }
    }
    setBusy(false);
    router.refresh();
    setTimeout(() => setItems([]), 2500);
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={
          "transition-quiet flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed py-10 text-center " +
          (dragOver ? "border-[var(--fg)] bg-[var(--surface-2)]" : "")
        }
      >
        <p className="text-sm font-medium">{busy ? "Uploading…" : "Drop files or click to upload"}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">Images, video, audio, PDF, design files &amp; archives · up to 2GB each</p>
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
      </div>

      {items.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {items.map((it, i) => (
            <div key={i} className="rounded-[var(--radius-input)] border p-2">
              <div className="flex items-center justify-between text-xs">
                <span className="truncate">{it.name}</span>
                <span className={it.error ? "text-[#C0442E]" : "text-[var(--muted)]"}>
                  {it.error ? "Failed" : it.progress === 100 ? "Done" : `${it.progress}%`}
                </span>
              </div>
              {!it.error && (
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${it.progress}%` }} />
                </div>
              )}
              {it.error && <p className="mt-1 text-xs text-[#C0442E]">{it.error}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
