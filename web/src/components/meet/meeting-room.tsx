"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CallStage } from "@/components/meet/call-stage";
import { MinutesPanel } from "@/components/meet/minutes-panel";
import type { TranscriptLine } from "@/components/meet/types";
import { cn } from "@/lib/utils";
import { MicIcon, MicOffIcon, CamIcon, CamOffIcon } from "@/components/meet/icons";
import { useMediaPermissions } from "@/lib/use-media-permissions";

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
  const [joinOpts, setJoinOpts] = useState<{ initialMicOn: boolean; initialCamOn: boolean }>({
    initialMicOn: false,
    initialCamOn: false,
  });

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

  const handleLeave = useCallback(() => {
    setJoined(false);
    window.location.href = "/chat";
  }, []);

  const [showTranscript, setShowTranscript] = useState(false);

  if (error) {
    return <Shell><p className="text-sm text-[var(--muted)]">{error}</p></Shell>;
  }
  if (!meeting) {
    return <Shell><p className="text-sm text-[var(--muted)]">Loading…</p></Shell>;
  }

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-[var(--bg)]">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-5">
        <Link href="/chat" className="font-display text-lg">EngageFlow</Link>
        <span className="text-[var(--muted)]">/</span>
        <span className="font-medium">{meeting.title}</span>
        <span className="ml-3 inline-flex items-center gap-1.5 rounded-full bg-[#C0442E]/10 px-2 py-0.5 text-xs font-medium text-[#C0442E]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#C0442E]" /> {meeting.status === "ENDED" ? "Ended" : "Live"}
        </span>
        <div className="ml-auto text-xs text-[var(--muted)]">Started by {meeting.createdByName}</div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-4">
          {!meeting.callConfigured ? (
            <NotConfigured />
          ) : !joined && meeting.status !== "ENDED" ? (
            <PreJoin
              title={meeting.title}
              onJoin={(opts) => {
                setJoinOpts(opts);
                setJoined(true);
              }}
              onError={setError}
            />
          ) : meeting.status === "ENDED" && !joined ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed">
              <p className="font-display text-2xl">This call has ended</p>
              <p className="text-sm text-[var(--muted)]">The transcript and minutes are on the right.</p>
            </div>
          ) : (
            <CallStage
              meetingId={id}
              meName={meName}
              initialMicOn={joinOpts.initialMicOn}
              initialCamOn={joinOpts.initialCamOn}
              onCaption={pushTranscript}
              onLeave={handleLeave}
              showTranscript={showTranscript}
              onToggleTranscript={() => setShowTranscript((prev) => !prev)}
              latestCaption={transcript.length > 0 ? transcript[transcript.length - 1] : null}
            />
          )}
        </div>

        {showTranscript && (
          <MinutesPanel
            meetingId={id}
            transcript={transcript}
            minutes={minutes}
            onMinutes={(m) => { setMinutes(m); }}
            onClose={() => setShowTranscript(false)}
          />
        )}
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

function PreJoin({
  title,
  onJoin,
}: {
  title: string;
  onJoin: (opts: { initialMicOn: boolean; initialCamOn: boolean }) => void;
  onError: (e: string) => void;
}) {
  const {
    isSupported,
    permissionState,
    micEnabled,
    cameraEnabled,
    mediaStream,
    errorMessage,
    requestPermissions,
    toggleMic,
    toggleCamera,
    stopAllTracks,
  } = useMediaPermissions(false, false); // mic muted by default to prevent acoustic room feedback loops

  const videoRef = useRef<HTMLVideoElement>(null);
  const [requesting, setRequesting] = useState(false);

  // Attach MediaStream to HTML <video> element
  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  const handleRequestPermissions = async (targetMic?: boolean, targetCam?: boolean) => {
    setRequesting(true);
    await requestPermissions(targetMic, targetCam);
    setRequesting(false);
  };

  const handleMicClick = async () => {
    if (mediaStream) {
      toggleMic();
    } else {
      await handleRequestPermissions(true, cameraEnabled);
    }
  };

  const handleCamClick = async () => {
    if (mediaStream) {
      toggleCamera();
    } else {
      await handleRequestPermissions(micEnabled, true);
    }
  };

  function join() {
    stopAllTracks();
    onJoin({ initialMicOn: micEnabled, initialCamOn: cameraEnabled });
  }

  function cancel() {
    stopAllTracks();
    window.location.href = "/chat";
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 rounded-[var(--radius-card)] border p-6">
      {/* 1. Context Warning Banner */}
      {!isSupported && (
        <div className="w-full max-w-xl rounded-[var(--radius-input)] border border-amber-500/20 bg-amber-500/10 p-3 text-center text-xs text-amber-500">
          ⚠️ Camera/Microphone access requires HTTPS or localhost context. You will join in watch mode.
        </div>
      )}

      {/* 2. Error Message Banner */}
      {errorMessage && (
        <div className="w-full max-w-xl rounded-[var(--radius-input)] border border-red-500/20 bg-red-500/10 p-3 text-center text-xs text-red-500">
          {errorMessage}
        </div>
      )}

      {/* 3. Pre-join Video Box */}
      <div className="relative aspect-video w-full max-w-xl overflow-hidden rounded-[var(--radius-card)] border bg-[#0A0A0A]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn("h-full w-full object-cover", cameraEnabled && permissionState === "granted" ? "block" : "hidden")}
        />
        {(!mediaStream || !cameraEnabled || permissionState !== "granted") && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
            {permissionState === "prompt" && !mediaStream ? (
              <div className="flex flex-col items-center gap-3 p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white/80">
                  <CamIcon />
                </div>
                <p className="font-display text-xl text-white">Camera & Microphone Preview</p>
                <p className="max-w-xs text-xs leading-relaxed text-white/60">
                  Enable your camera and microphone to preview your video and audio before entering.
                </p>
                <button
                  type="button"
                  onClick={() => handleRequestPermissions()}
                  disabled={requesting}
                  className="mt-2 rounded-[var(--radius-input)] bg-white/15 px-6 py-2.5 text-xs font-medium text-white transition hover:bg-white/25 disabled:opacity-50"
                >
                  {requesting ? "Starting camera…" : "Allow Camera & Mic"}
                </button>
              </div>
            ) : permissionState === "denied" ? (
              <div className="flex flex-col items-center gap-3 p-8 text-center">
                <p className="font-display text-xl text-white">Camera & Mic Access Blocked</p>
                <p className="max-w-xs text-xs leading-relaxed text-white/60">
                  Click the 🔒 lock icon in your browser address bar to allow Camera and Microphone permissions.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRequestPermissions()}
                    disabled={requesting}
                    className="rounded-[var(--radius-input)] bg-white/15 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/25 disabled:opacity-50"
                  >
                    {requesting ? "Requesting…" : "Retry Permission"}
                  </button>
                  <button
                    type="button"
                    onClick={join}
                    className="rounded-[var(--radius-input)] bg-white/30 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/40"
                  >
                    Join Watch-Only →
                  </button>
                </div>
              </div>
            ) : !cameraEnabled ? (
              <div className="flex flex-col items-center gap-2 text-white/70">
                <CamOffIcon size={24} />
                <span className="text-sm font-medium">Camera is turned off</span>
              </div>
            ) : (
              <div className="text-sm text-white/70">Starting your camera…</div>
            )}
          </div>
        )}
      </div>

      {/* 4. Controls Overlay */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleMicClick}
          className={cn(
            "inline-flex h-11 w-11 items-center justify-center rounded-full border transition",
            !micEnabled
              ? "border-[#C0442E]/40 bg-[#C0442E]/10 text-[#C0442E]"
              : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg)]"
          )}
          title={micEnabled ? "Mute Mic" : "Unmute Mic"}
        >
          {micEnabled ? <MicIcon /> : <MicOffIcon />}
        </button>
        <button
          type="button"
          onClick={handleCamClick}
          className={cn(
            "inline-flex h-11 w-11 items-center justify-center rounded-full border transition",
            !cameraEnabled
              ? "border-[#C0442E]/40 bg-[#C0442E]/10 text-[#C0442E]"
              : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg)]"
          )}
          title={cameraEnabled ? "Turn Off Camera" : "Turn On Camera"}
        >
          {cameraEnabled ? <CamIcon /> : <CamOffIcon />}
        </button>
      </div>

      <div className="text-center">
        <p className="font-display text-3xl">{title}</p>
        <p className="mt-1 max-w-md text-sm text-[var(--muted)]">
          Joined with camera and microphone muted for room safety.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={cancel}
          className="rounded-[var(--radius-input)] border border-[var(--border)] px-6 py-2.5 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--fg)]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={join}
          className="rounded-[var(--radius-input)] bg-[var(--accent)] px-8 py-2.5 text-sm font-medium text-[var(--accent-fg)] transition hover:opacity-90"
        >
          Join call
        </button>
      </div>
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
