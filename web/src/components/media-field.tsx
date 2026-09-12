"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type MediaValue = {
  url: string;
  mediaType: string; // "image" | "video"
  width?: number;
  height?: number;
  posterUrl?: string;
  name?: string;
};

type Mode = "upload" | "link";

function guessTypeFromUrl(url: string): string {
  return /\.(mp4|mov|webm|m4v|avi)(\?|$)/i.test(url) ? "video" : "image";
}

// Upload-first media picker with a manual-URL fallback. Streams the file to
// /api/upload (the same pipeline as project Files), then reports the stored
// url + media metadata up so the content/version is created with real media.
export function MediaField({
  value,
  onChange,
  projectId,
  clientId,
}: {
  value: MediaValue | null;
  onChange: (v: MediaValue | null) => void;
  projectId?: string;
  clientId?: string;
}) {
  const [mode, setMode] = useState<Mode>("upload");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function uploadOne(file: File) {
    setError(null);
    setProgress(0);
    const qs = new URLSearchParams();
    if (projectId) qs.set("projectId", projectId);
    if (clientId) qs.set("clientId", clientId);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/upload?${qs.toString()}`);
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.setRequestHeader("x-filename", encodeURIComponent(file.name));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setProgress(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const asset = JSON.parse(xhr.responseText).data;
          onChange({
            url: asset.url,
            mediaType: asset.kind === "video" ? "video" : "image",
            width: asset.width ?? undefined,
            height: asset.height ?? undefined,
            posterUrl: asset.posterUrl ?? undefined,
            name: asset.name,
          });
        } catch {
          setError("Upload succeeded but the response was unreadable.");
        }
      } else {
        let msg = `Upload failed (${xhr.status})`;
        try { msg = JSON.parse(xhr.responseText).error ?? msg; } catch {}
        setError(msg);
      }
    };
    xhr.onerror = () => { setProgress(null); setError("Network error during upload."); };
    xhr.send(file);
  }

  function applyUrl() {
    const url = urlInput.trim();
    if (!url) { onChange(null); return; }
    onChange({ url, mediaType: guessTypeFromUrl(url) });
  }

  // --- has a selection: show preview + remove ---
  if (value) {
    return (
      <div className="rounded-[var(--radius-card)] border p-3">
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-input)] border bg-[var(--surface-2)]">
            {value.mediaType === "video" ? (
              value.posterUrl ? (
                <img src={value.posterUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-[var(--muted)]">video</div>
              )
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value.url} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{value.name ?? value.url.split("/").pop()}</p>
            <p className="text-xs text-[var(--muted)]">
              {value.mediaType}
              {value.width && value.height ? ` · ${value.width}×${value.height}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { onChange(null); setUrlInput(""); }}
            className="shrink-0 rounded-[var(--radius-input)] border px-2.5 py-1 text-xs text-[var(--muted)] hover:text-[var(--fg)]"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  // --- no selection yet: upload / link tabs ---
  return (
    <div>
      <div className="mb-2 flex items-center gap-1 rounded-[var(--radius-input)] border p-0.5 text-sm">
        {(["upload", "link"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 rounded-[calc(var(--radius-input)-2px)] px-3 py-1.5 capitalize transition",
              mode === m ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "text-[var(--muted)] hover:text-[var(--fg)]",
            )}
          >
            {m === "upload" ? "Upload file" : "Paste link"}
          </button>
        ))}
      </div>

      {mode === "upload" ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) uploadOne(e.dataTransfer.files[0]); }}
          onClick={() => progress === null && inputRef.current?.click()}
          className={cn(
            "transition-quiet flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed py-8 text-center",
            dragOver && "border-[var(--fg)] bg-[var(--surface-2)]",
          )}
        >
          {progress !== null ? (
            <div className="w-full max-w-xs px-4">
              <p className="text-sm">Uploading… {progress}%</p>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium">Drop an image or video, or click to choose</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Stored securely · up to 2GB</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            hidden
            onChange={(e) => { if (e.target.files?.[0]) uploadOne(e.target.files[0]); e.target.value = ""; }}
          />
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onBlur={applyUrl}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyUrl(); } }}
            placeholder="https://… (image or video URL)"
            className="w-full rounded-[var(--radius-input)] border bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--fg)]/40"
          />
          <button type="button" onClick={applyUrl} className="shrink-0 rounded-[var(--radius-input)] border px-3 py-2 text-sm hover:bg-[var(--surface-2)]">
            Use
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-[#C0442E]">{error}</p>}
      <p className="mt-1.5 text-xs text-[var(--muted)]">Optional — leave empty to start with a placeholder you can replace later.</p>
    </div>
  );
}
