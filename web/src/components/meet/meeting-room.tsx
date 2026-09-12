"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CallStage } from "@/components/meet/call-stage";
import { MinutesPanel } from "@/components/meet/minutes-panel";
import type { TranscriptLine } from "@/components/meet/types";

type MeetingData = {
  id: string;
  title: string;
  status: string;
  roomName: string;
  channelId: string | null;
  createdByName: string;
  transcript: TranscriptLine[];
  minutes: string | null;
  callConfigured: boolean;
};

export function MeetingRoom({ id, meName }: { id: string; meName: string }) {
  const [meeting, setMeeting] = useState<MeetingData | null>(null);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [minutes, setMinutes] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/meetings/${id}`);
    if (res.ok) {
      const { data } = await res.json();
      setMeeting(data);
      setTranscript(data.transcript ?? []);
      setMinutes(data.minutes ?? null);
    } else {
      setError("This meeting is unavailable.");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Locally track a caption line + persist it (each participant transcribes self).
  const pushTranscript = useCallback(
    async (line: TranscriptLine) => {
      setTranscript((prev) => [...prev, line]);
      await fetch(`/api/meetings/${id}/transcript`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lines: [line] }),
      }).catch(() => {});
    },
    [id],
  );

  if (error) {
    return <Shell><p className="text-sm text-[var(--muted)]">{error}</p></Shell>;
  }
  if (!meeting) {
    return <Shell><p className="text-sm text-[var(--muted)]">Loading…</p></Shell>;
  }

  return (
    <div className="flex h-dvh flex-col bg-[var(--bg)]">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-5">
        <Link href="/chat" className="font-display text-lg">EngageFlow</Link>
        <span className="text-[var(--muted)]">/</span>
        <span className="font-medium">{meeting.title}</span>
        <span className="ml-3 inline-flex items-center gap-1.5 rounded-full bg-[#C0442E]/10 px-2 py-0.5 text-xs font-medium text-[#C0442E]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#C0442E]" /> {meeting.status === "ENDED" ? "Ended" : "Live"}
        </span>
        <div className="ml-auto text-xs text-[var(--muted)]">Started by {meeting.createdByName}</div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col p-4">
          {!meeting.callConfigured ? (
            <NotConfigured />
          ) : !joined && meeting.status !== "ENDED" ? (
            <PreJoin title={meeting.title} onJoin={() => setJoined(true)} onError={setError} />
          ) : meeting.status === "ENDED" && !joined ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed">
              <p className="font-display text-2xl">This call has ended</p>
              <p className="text-sm text-[var(--muted)]">The transcript and minutes are on the right.</p>
            </div>
          ) : (
            <CallStage
              meetingId={id}
              meName={meName}
              onCaption={pushTranscript}
              onLeave={() => setJoined(false)}
            />
          )}
        </div>

        <MinutesPanel
          meetingId={id}
          transcript={transcript}
          minutes={minutes}
          onMinutes={(m) => { setMinutes(m); }}
        />
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh items-center justify-center bg-[var(--bg)]">
      <div className="text-center">{children}</div>
    </div>
  );
}

function PreJoin({ title, onJoin }: { title: string; onJoin: () => void; onError: (e: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setReady(true);
      })
      .catch(() => setBlocked(true));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function join() {
    // Release the preview stream so the call can re-acquire the devices cleanly.
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onJoin();
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 rounded-[var(--radius-card)] border p-6">
      <div className="relative aspect-video w-full max-w-xl overflow-hidden rounded-[var(--radius-card)] border bg-[#0A0A0A]">
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
            {blocked ? "Camera/mic blocked — you can still join audio-free." : "Starting your camera…"}
          </div>
        )}
      </div>
      <div className="text-center">
        <p className="font-display text-3xl">{title}</p>
        <p className="mt-1 max-w-md text-sm text-[var(--muted)]">
          Camera and mic turn on when you join. Live captions run in your browser and feed the meeting transcript.
        </p>
      </div>
      <button
        onClick={join}
        className="transition-quiet rounded-[var(--radius-input)] bg-[var(--accent)] px-8 py-2.5 text-sm font-medium text-[var(--accent-fg)] hover:opacity-90"
      >
        Join call
      </button>
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed p-8 text-center">
      <p className="font-display text-2xl">Calling isn't connected yet</p>
      <p className="max-w-md text-sm text-[var(--muted)]">
        Live audio and video use LiveKit. Add a LiveKit server (self-hosted or LiveKit Cloud) by setting these in
        your environment, then reload:
      </p>
      <pre className="mt-1 rounded-[var(--radius-input)] bg-[var(--surface-2)] px-4 py-3 text-left text-xs text-[var(--fg)]">
{`LIVEKIT_URL=wss://your-server
NEXT_PUBLIC_LIVEKIT_URL=wss://your-server
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...`}
      </pre>
      <p className="max-w-md text-xs text-[var(--muted)]">
        Everything else already works: the meeting record, the transcript feed, and Heisenberg's minutes generation.
      </p>
    </div>
  );
}
