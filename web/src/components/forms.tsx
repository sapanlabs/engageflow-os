"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import {
  createClientAction,
  createProjectAction,
  createContentAction,
  addVersionAction,
} from "@/lib/actions";
import {
  PLATFORMS,
  PLATFORM_LABELS,
  STYLES,
  STYLE_LABELS,
} from "@/lib/constants";
import { useAiStatus } from "@/components/ai-hooks";
import { MediaField, type MediaValue } from "@/components/media-field";

function useDisclosure() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-[var(--radius-card)] border bg-[var(--bg)] p-6 shadow-xl">
        <h2 className="font-display text-2xl">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-[var(--radius-input)] border bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--fg)]/40";
const labelCls = "mb-1.5 block text-sm font-medium";

function ErrorNote({ message }: { message: string }) {
  return (
    <div className="mb-3 rounded-[var(--radius-input)] border border-[#C0442E]/30 bg-[#C0442E]/10 px-3 py-2 text-sm text-[#C0442E]">
      {message}{" "}
      <a href="/settings/billing" className="underline">View plans</a>
    </div>
  );
}

export function NewClientButton() {
  const { open, setOpen } = useDisclosure();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function submit(fd: FormData) {
    setError(null);
    start(async () => {
      const res = await createClientAction(fd);
      if (res.ok) {
        setOpen(false);
        router.push(`/clients/${res.id}`);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>New client</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New client">
        {error && <ErrorNote message={error} />}
        <form action={submit} className="flex flex-col gap-3">
          <div>
            <label className={labelCls}>Client name</label>
            <input name="name" required className={inputCls} placeholder="Northwind Coffee Roasters" />
          </div>
          <div>
            <label className={labelCls}>Industry</label>
            <input name="industry" className={inputCls} placeholder="Food & Beverage" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Contact name</label>
              <input name="contactName" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Contact email</label>
              <input name="contactEmail" type="email" className={inputCls} />
            </div>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} type="button">Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create client"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function NewProjectButton({ clientId }: { clientId: string }) {
  const { open, setOpen } = useDisclosure();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function submit(fd: FormData) {
    fd.set("clientId", clientId);
    setError(null);
    start(async () => {
      const res = await createProjectAction(fd);
      if (res.ok) {
        setOpen(false);
        router.push(`/projects/${res.id}`);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>New project</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New project">
        {error && <ErrorNote message={error} />}
        <form action={submit} className="flex flex-col gap-3">
          <div>
            <label className={labelCls}>Project name</label>
            <input name="name" required className={inputCls} placeholder="Autumn Harvest Launch" />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea name="description" rows={3} className={inputCls} />
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} type="button">Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create project"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function NewContentButton({
  projectId,
  editorId,
}: {
  projectId: string;
  editorId: string;
}) {
  const { open, setOpen } = useDisclosure();
  const [pending, start] = useTransition();
  const router = useRouter();
  const ai = useAiStatus();

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [platform, setPlatform] = useState<string>(PLATFORMS.INSTAGRAM_POST);
  const [style, setStyle] = useState<string>("STATIC_POST");
  const [media, setMedia] = useState<MediaValue | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [hashtags, setHashtags] = useState<string[]>([]);

  function reset() {
    setTitle(""); setCaption(""); setPlatform(PLATFORMS.INSTAGRAM_POST);
    setStyle("STATIC_POST"); setMedia(null); setHashtags([]); setAiError(null);
  }

  async function draftWithAi() {
    if (!title.trim()) { setAiError("Add a title first so AI has something to work with."); return; }
    setDrafting(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/caption", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, platform, style }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "AI request failed");
      setCaption(j.data.primary ?? "");
      setHashtags(j.data.hashtags ?? []);
    } catch (e) {
      setAiError((e as Error).message);
    } finally {
      setDrafting(false);
    }
  }

  function submit() {
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("authorId", editorId);
    fd.set("title", title);
    fd.set("caption", hashtags.length ? `${caption}\n\n${hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}` : caption);
    fd.set("platform", platform);
    fd.set("style", style);
    if (media) {
      fd.set("mediaUrl", media.url);
      fd.set("mediaType", media.mediaType);
      if (media.width) fd.set("width", String(media.width));
      if (media.height) fd.set("height", String(media.height));
      if (media.posterUrl) fd.set("posterUrl", media.posterUrl);
    }
    start(async () => {
      const id = await createContentAction(fd);
      setOpen(false);
      reset();
      router.push(`/content/${id}`);
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>New content</Button>
      <Modal open={open} onClose={() => { setOpen(false); reset(); }} title="New content">
        <div className="flex flex-col gap-3">
          <div>
            <label className={labelCls}>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputCls} placeholder="Single-Origin Ethiopia feed post" />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium">Caption</label>
              {ai?.features.caption && (
                <button type="button" onClick={draftWithAi} disabled={drafting}
                  className="transition-quiet rounded-full border px-2.5 py-1 text-xs font-medium hover:bg-[var(--surface-2)] disabled:opacity-50">
                  {drafting ? "Drafting…" : "✨ Draft with AI"}
                </button>
              )}
            </div>
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} className={inputCls} />
            {hashtags.length > 0 && (
              <p className="mt-1 text-xs text-[var(--muted)]">{hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}</p>
            )}
            {aiError && <p className="mt-1 text-xs text-[#C0442E]">{aiError}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Platform</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={inputCls}>
                {Object.values(PLATFORMS).map((p) => (
                  <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Style</label>
              <select value={style} onChange={(e) => setStyle(e.target.value)} className={inputCls}>
                {STYLES.map((s) => (
                  <option key={s} value={s}>{STYLE_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Media</label>
            <MediaField value={media} onChange={setMedia} projectId={projectId} />
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setOpen(false); reset(); }} type="button">Cancel</Button>
            <Button type="button" onClick={submit} disabled={pending || !title.trim()}>{pending ? "Creating…" : "Create content"}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function AddVersionButton({
  contentId,
  editorId,
  projectId,
  clientId,
}: {
  contentId: string;
  editorId: string;
  projectId?: string;
  clientId?: string;
}) {
  const { open, setOpen } = useDisclosure();
  const [pending, start] = useTransition();
  const router = useRouter();
  const [media, setMedia] = useState<MediaValue | null>(null);
  const [notes, setNotes] = useState("");

  function close() {
    setOpen(false);
    setMedia(null);
    setNotes("");
  }

  function submit() {
    const fd = new FormData();
    fd.set("contentId", contentId);
    fd.set("authorId", editorId);
    fd.set("notes", notes);
    if (media) {
      fd.set("mediaUrl", media.url);
      fd.set("mediaType", media.mediaType);
      if (media.width) fd.set("width", String(media.width));
      if (media.height) fd.set("height", String(media.height));
      if (media.posterUrl) fd.set("posterUrl", media.posterUrl);
    }
    start(async () => {
      await addVersionAction(fd);
      close();
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>Upload new version</Button>
      <Modal open={open} onClose={close} title="Upload new version">
        <div className="flex flex-col gap-3">
          <div>
            <label className={labelCls}>Media</label>
            <MediaField value={media} onChange={setMedia} projectId={projectId} clientId={clientId} />
          </div>
          <div>
            <label className={labelCls}>Notes for this revision</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputCls} placeholder="What changed since last version" />
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={close} type="button">Cancel</Button>
            <Button type="button" onClick={submit} disabled={pending}>{pending ? "Uploading…" : "Upload version"}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
