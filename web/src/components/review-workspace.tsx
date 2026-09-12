"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlatformPreview } from "@/components/platform-preview";
import { Button, Avatar, StatusBadge } from "@/components/ui";
import {
  addCommentAction,
  approveAction,
  requestChangesAction,
  resolveCommentAction,
  setStatusAction,
} from "@/lib/actions";
import { PLATFORM_LABELS, STYLE_LABELS } from "@/lib/constants";
import { formatDateTime, timeAgo } from "@/lib/utils";
import { useAiStatus } from "@/components/ai-hooks";

export type VersionDTO = {
  id: string;
  number: number;
  mediaUrl: string;
  mediaType: string;
  notes?: string | null;
  approved: boolean;
  authorName: string;
  createdAt: string;
};

export type CommentDTO = {
  id: string;
  versionId: string | null;
  authorName: string;
  body: string;
  pinX: number | null;
  pinY: number | null;
  resolved: boolean;
  createdAt: string;
};

type Props = {
  contentId: string;
  title: string;
  platform: string;
  style: string;
  status: string;
  caption?: string | null;
  versions: VersionDTO[];
  comments: CommentDTO[];
  mode: "internal" | "client";
  commenterName: string; // who is leaving comments
};

const VERTICAL_PLATFORMS = new Set(["INSTAGRAM_REEL", "INSTAGRAM_STORY", "YOUTUBE_SHORTS"]);

export function ReviewWorkspace(props: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selectedId, setSelectedId] = useState(props.versions[0]?.id);
  const [placing, setPlacing] = useState(false);
  const [draftPin, setDraftPin] = useState<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState("");
  const [changeNote, setChangeNote] = useState("");

  const ai = useAiStatus();
  const [checklist, setChecklist] = useState<string[] | null>(null);
  const [checklistBusy, setChecklistBusy] = useState(false);
  const [fit, setFit] = useState<"cover" | "contain">("cover");
  const [safeZones, setSafeZones] = useState(false);

  const selected = props.versions.find((v) => v.id === selectedId) ?? props.versions[0];
  const versionComments = useMemo(
    () => props.comments.filter((c) => !c.versionId || c.versionId === selected?.id),
    [props.comments, selected?.id],
  );
  const pins = versionComments.filter((c) => c.pinX != null && c.pinY != null);
  const unresolvedCount = props.comments.filter((c) => !c.resolved).length;

  async function buildChecklist() {
    setChecklistBusy(true);
    try {
      const res = await fetch("/api/ai/checklist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentId: props.contentId }),
      });
      const j = await res.json();
      if (res.ok) setChecklist(j.data.items ?? []);
    } finally {
      setChecklistBusy(false);
    }
  }

  function onMediaClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!placing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setDraftPin({ x, y });
    setPlacing(false);
  }

  function submitComment() {
    if (!draft.trim() || !selected) return;
    const fd = new FormData();
    fd.set("contentId", props.contentId);
    fd.set("versionId", selected.id);
    fd.set("authorName", props.commenterName);
    fd.set("body", draft.trim());
    if (draftPin) {
      fd.set("pinX", String(draftPin.x));
      fd.set("pinY", String(draftPin.y));
    }
    start(async () => {
      await addCommentAction(fd);
      setDraft("");
      setDraftPin(null);
      router.refresh();
    });
  }

  function doApprove() {
    start(async () => {
      await approveAction(props.contentId, props.commenterName);
      router.refresh();
    });
  }

  function doRequestChanges() {
    if (!changeNote.trim()) return;
    start(async () => {
      await requestChangesAction({
        contentId: props.contentId,
        body: changeNote.trim(),
        byName: props.commenterName,
        versionId: selected?.id,
      });
      setChangeNote("");
      router.refresh();
    });
  }

  function move(status: string) {
    start(async () => {
      await setStatusAction(props.contentId, status);
      router.refresh();
    });
  }

  function toggleResolve(id: string, resolved: boolean) {
    start(async () => {
      await resolveCommentAction(id, props.contentId, resolved);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      {/* Preview + version rail */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-[var(--muted)]">
            {PLATFORM_LABELS[props.platform]} · {STYLE_LABELS[props.style] ?? props.style}
          </p>
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-[var(--radius-input)] border text-xs">
              <button
                onClick={() => setFit("cover")}
                className={"px-2.5 py-1.5 " + (fit === "cover" ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "text-[var(--muted)]")}
              >Fill</button>
              <button
                onClick={() => setFit("contain")}
                className={"px-2.5 py-1.5 " + (fit === "contain" ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "text-[var(--muted)]")}
              >Fit</button>
            </div>
            {VERTICAL_PLATFORMS.has(props.platform) && (
              <button
                onClick={() => setSafeZones((v) => !v)}
                className={"rounded-[var(--radius-input)] border px-2.5 py-1.5 text-xs " + (safeZones ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "text-[var(--muted)]")}
                title="Show the platform's caption / action-rail safe zones"
              >Safe zones</button>
            )}
            <Button
              variant={placing ? "primary" : "secondary"}
              onClick={() => { setPlacing((p) => !p); setDraftPin(null); }}
            >
              {placing ? "Click to pin" : "Pin a comment"}
            </Button>
          </div>
        </div>

        {selected && (
          <PlatformPreview
            platform={props.platform}
            mediaUrl={selected.mediaUrl}
            caption={props.caption}
            mediaType={selected.mediaType}
            posterUrl={selected.mediaUrl}
            fit={fit}
            safeZones={safeZones}
          >
            <div
              className={placing ? "absolute inset-0 cursor-crosshair" : "absolute inset-0"}
              onClick={onMediaClick}
            >
              {pins.map((c, i) => (
                <Pin key={c.id} n={i + 1} x={c.pinX!} y={c.pinY!} resolved={c.resolved} label={c.body} />
              ))}
              {draftPin && <Pin n={pins.length + 1} x={draftPin.x} y={draftPin.y} draft />}
            </div>
          </PlatformPreview>
        )}

        {/* Version history */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {props.versions.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedId(v.id)}
              className={
                "transition-quiet shrink-0 overflow-hidden rounded-[var(--radius-input)] border " +
                (v.id === selected?.id ? "border-[var(--fg)]" : "border-[var(--border)] opacity-70 hover:opacity-100")
              }
              title={`Version ${v.number}${v.approved ? " (approved)" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={v.mediaUrl} alt={`v${v.number}`} className="h-16 w-16 object-cover" />
              <span className="block px-1 py-0.5 text-[10px]">
                V{v.number}{v.approved ? " ✓" : ""}
              </span>
            </button>
          ))}
        </div>
        {selected?.notes && (
          <p className="text-sm text-[var(--muted)]">
            <span className="font-medium text-[var(--fg)]">V{selected.number} notes:</span> {selected.notes}
          </p>
        )}
        {selected && (
          <p className="text-xs text-[var(--muted)]">
            Version {selected.number} · {selected.authorName} · {formatDateTime(selected.createdAt)}
          </p>
        )}
      </div>

      {/* Side panel: actions + comments */}
      <div className="flex flex-col gap-5">
        <div className="rounded-[var(--radius-card)] border p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <StatusBadge status={props.status} />
          </div>

          {props.mode === "client" ? (
            <div className="flex flex-col gap-3">
              <Button onClick={doApprove} disabled={pending}>Approve this version</Button>
              <div>
                <textarea
                  value={changeNote}
                  onChange={(e) => setChangeNote(e.target.value)}
                  rows={3}
                  placeholder="Describe the changes you'd like"
                  className="w-full rounded-[var(--radius-input)] border bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--fg)]/40"
                />
                <Button variant="danger" onClick={doRequestChanges} disabled={pending} className="mt-2 w-full">
                  Request changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => move("IN_REVIEW")} disabled={pending}>Send to review</Button>
              <Button variant="secondary" onClick={() => move("SCHEDULED")} disabled={pending}>Schedule</Button>
              <Button variant="secondary" onClick={() => move("PUBLISHED")} disabled={pending}>Mark published</Button>
              <Button onClick={doApprove} disabled={pending}>Approve</Button>
            </div>
          )}
        </div>

        {/* Comment composer */}
        <div className="rounded-[var(--radius-card)] border p-4">
          <p className="mb-2 text-sm font-medium">
            {draftPin ? "Pinned comment" : "Add a comment"}
          </p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder={draftPin ? "Comment on the pinned spot…" : "Leave feedback for the team…"}
            className="w-full rounded-[var(--radius-input)] border bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--fg)]/40"
          />
          <div className="mt-2 flex items-center justify-between">
            {draftPin ? (
              <span className="text-xs text-[var(--muted)]">Pinned at {Math.round(draftPin.x * 100)}%, {Math.round(draftPin.y * 100)}%</span>
            ) : <span />}
            <Button onClick={submitComment} disabled={pending || !draft.trim()}>Comment</Button>
          </div>
        </div>

        {/* AI: turn feedback into an editor checklist */}
        {props.mode === "internal" && ai?.features.checklist && unresolvedCount > 0 && (
          <div className="rounded-[var(--radius-card)] border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Action checklist</p>
              <button onClick={buildChecklist} disabled={checklistBusy}
                className="transition-quiet rounded-full border px-2.5 py-1 text-xs font-medium hover:bg-[var(--surface-2)] disabled:opacity-50">
                {checklistBusy ? "Summarizing…" : "✨ From feedback"}
              </button>
            </div>
            {checklist && (
              checklist.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--muted)]">No actionable items found.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {checklist.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 h-4 w-4 shrink-0 rounded-[4px] border" />
                      {item}
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        )}

        {/* Comment thread */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Comments · {versionComments.length}</p>
          {versionComments.length === 0 && (
            <p className="text-sm text-[var(--muted)]">No comments on this version yet.</p>
          )}
          {versionComments.map((c, i) => (
            <div key={c.id} className={"rounded-[var(--radius-card)] border p-3 " + (c.resolved ? "opacity-60" : "")}>
              <div className="flex items-start gap-2">
                {c.pinX != null && (
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-semibold text-[var(--accent-fg)]">
                    {pins.findIndex((p) => p.id === c.id) + 1 || i + 1}
                  </span>
                )}
                <Avatar name={c.authorName} size={22} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{c.authorName}</span>{" "}
                    <span className="text-xs text-[var(--muted)]">{timeAgo(c.createdAt)}</span>
                  </p>
                  <p className="mt-0.5 text-sm">{c.body}</p>
                  <button
                    onClick={() => toggleResolve(c.id, !c.resolved)}
                    className="mt-1 text-xs text-[var(--muted)] hover:text-[var(--fg)]"
                  >
                    {c.resolved ? "Reopen" : "Resolve"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Pin({ n, x, y, resolved, draft, label }: { n: number; x: number; y: number; resolved?: boolean; draft?: boolean; label?: string }) {
  return (
    <span
      className="group absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
    >
      <span
        className={
          "flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[11px] font-semibold text-white shadow-md " +
          (draft ? "animate-pulse " : "") +
          (resolved ? "bg-[#2E7D4F]" : "bg-[var(--accent)]")
        }
      >
        {n}
      </span>
      {label && (
        <span className="pointer-events-none absolute left-7 top-0 hidden max-w-[180px] rounded-md bg-black/80 px-2 py-1 text-xs text-white group-hover:block">
          {label}
        </span>
      )}
    </span>
  );
}
