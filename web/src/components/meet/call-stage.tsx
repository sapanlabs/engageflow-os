"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  Track,
  ConnectionState,
  type Participant,
  type TrackPublication,
} from "livekit-client";
import { cn } from "@/lib/utils";
import {
  MicIcon, MicOffIcon, CamIcon, CamOffIcon, ScreenIcon, CaptionsIcon,
  PeopleIcon, SettingsIcon, CopyIcon, LeaveIcon, GridIcon, SpotlightIcon,
} from "@/components/meet/icons";
import type { TranscriptLine } from "@/components/meet/types";

type Layout = "grid" | "spotlight";

export function CallStage({
  meetingId,
  meName,
  onCaption,
  onLeave,
}: {
  meetingId: string;
  meName: string;
  onCaption: (line: TranscriptLine) => void;
  onLeave: () => void;
}) {
  const roomRef = useRef<Room | null>(null);
  const [, rerender] = useReducer((x) => x + 1, 0);
  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const [reconnecting, setReconnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [layout, setLayout] = useState<Layout>("grid");
  const [showPeople, setShowPeople] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);

  const [speaking, setSpeaking] = useState<Set<string>>(new Set());
  const [elapsed, setElapsed] = useState(0);
  const joinedAt = useRef<number | null>(null);

  // --- connect ---
  useEffect(() => {
    let cancelled = false;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;
    const bump = () => rerender();

    room
      .on(RoomEvent.ParticipantConnected, bump)
      .on(RoomEvent.ParticipantDisconnected, bump)
      .on(RoomEvent.TrackSubscribed, bump)
      .on(RoomEvent.TrackUnsubscribed, bump)
      .on(RoomEvent.LocalTrackPublished, bump)
      .on(RoomEvent.LocalTrackUnpublished, bump)
      .on(RoomEvent.TrackMuted, bump)
      .on(RoomEvent.TrackUnmuted, bump)
      .on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
        setSpeaking(new Set(speakers.map((s) => s.sid)));
      })
      .on(RoomEvent.Reconnecting, () => setReconnecting(true))
      .on(RoomEvent.Reconnected, () => setReconnecting(false))
      .on(RoomEvent.ConnectionStateChanged, (s: ConnectionState) => {
        setReconnecting(s === ConnectionState.Reconnecting);
      })
      .on(RoomEvent.Disconnected, () => {
        if (!cancelled) onLeave();
      });

    (async () => {
      try {
        const res = await fetch(`/api/meetings/${meetingId}/token`, { method: "POST" });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? "Could not get a join token");
        }
        const { data } = await res.json();
        await room.connect(data.url, data.token);
        if (cancelled) return;
        await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);
        joinedAt.current = Date.now();
        setStatus("connected");
        rerender();
      } catch (e) {
        if (cancelled) return;
        setErrorMsg((e as Error).message);
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      room.disconnect();
      roomRef.current = null;
    };
  }, [meetingId, onLeave]);

  // --- meeting timer ---
  useEffect(() => {
    if (status !== "connected") return;
    const t = setInterval(() => {
      if (joinedAt.current) setElapsed(Math.floor((Date.now() - joinedAt.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [status]);

  // --- in-browser captions (Web Speech API) ---
  useEffect(() => {
    if (!captionsOn || status !== "connected") return;
    const SR = (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (ev: SpeechRecognitionEventLike) => {
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) {
          const text = r[0].transcript.trim();
          if (text) onCaption({ speaker: meName, text, ts: Date.now() });
        }
      }
    };
    rec.onerror = () => {};
    let stopped = false;
    rec.onend = () => { if (!stopped) try { rec.start(); } catch { /* noop */ } };
    try { rec.start(); } catch { /* noop */ }
    return () => { stopped = true; try { rec.stop(); } catch { /* noop */ } };
  }, [captionsOn, status, meName, onCaption]);

  // --- controls ---
  async function toggleMic() {
    const p = roomRef.current?.localParticipant;
    if (!p) return;
    const next = !micOn;
    await p.setMicrophoneEnabled(next);
    setMicOn(next);
  }
  async function toggleCam() {
    const p = roomRef.current?.localParticipant;
    if (!p) return;
    const next = !camOn;
    await p.setCameraEnabled(next);
    setCamOn(next);
  }
  async function toggleShare() {
    const p = roomRef.current?.localParticipant;
    if (!p) return;
    const next = !sharing;
    try {
      await p.setScreenShareEnabled(next);
      setSharing(next);
      if (next) setLayout("spotlight");
    } catch { /* user cancelled */ }
  }
  async function leave() {
    await fetch(`/api/meetings/${meetingId}/end`, { method: "POST" }).catch(() => {});
    roomRef.current?.disconnect();
    onLeave();
  }
  function copyLink() {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const room = roomRef.current;
  const participants: Participant[] = room ? [room.localParticipant, ...Array.from(room.remoteParticipants.values())] : [];
  const screenSharer = participants.find((p) => publicationBySource(p, Track.Source.ScreenShare));
  const effectiveLayout: Layout = screenSharer ? "spotlight" : layout;

  if (status === "error") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed">
        <p className="font-display text-2xl">Couldn't join the call</p>
        <p className="max-w-sm text-center text-sm text-[var(--muted)]">{errorMsg}</p>
        <button onClick={onLeave} className="rounded-[var(--radius-input)] border px-4 py-2 text-sm">Back</button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      {/* status bar */}
      <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className={cn("h-2 w-2 rounded-full", reconnecting ? "bg-[#C9A227]" : "bg-[#2E7D4F]")} />
          {reconnecting ? "Reconnecting…" : "Connected"}
        </span>
        <span>·</span>
        <span className="tabular-nums">{fmtDuration(elapsed)}</span>
        <span>·</span>
        <span>{participants.length} {participants.length === 1 ? "person" : "people"}</span>
        <div className="ml-auto flex items-center gap-1">
          <IconChip onClick={() => setLayout((l) => (l === "grid" ? "spotlight" : "grid"))} title={layout === "grid" ? "Spotlight view" : "Grid view"} disabled={!!screenSharer}>
            {layout === "grid" ? <SpotlightIcon size={16} /> : <GridIcon size={16} />}
          </IconChip>
          <IconChip onClick={copyLink} title="Copy invite link">
            <CopyIcon size={16} />
          </IconChip>
          {copied && <span className="text-[var(--accent)]">Copied</span>}
        </div>
      </div>

      {/* stage */}
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="min-w-0 flex-1">
          {effectiveLayout === "spotlight" ? (
            <div className="flex h-full flex-col gap-3">
              <div className="min-h-0 flex-1">
                {screenSharer ? (
                  <ParticipantTile participant={screenSharer} source={Track.Source.ScreenShare} speaking={false} big />
                ) : (
                  <ParticipantTile participant={activeSpeakerOf(participants, speaking)} source={Track.Source.Camera} speaking big />
                )}
              </div>
              <div className="flex h-24 shrink-0 gap-2 overflow-x-auto">
                {participants.map((p) => (
                  <div key={p.sid} className="aspect-video h-full shrink-0">
                    <ParticipantTile participant={p} source={Track.Source.Camera} speaking={speaking.has(p.sid)} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={cn("grid h-full gap-3", gridCols(participants.length))}>
              {participants.map((p) => (
                <ParticipantTile key={p.sid} participant={p} source={Track.Source.Camera} speaking={speaking.has(p.sid)} />
              ))}
              {status === "connecting" && participants.length === 0 && (
                <div className="col-span-full flex items-center justify-center text-sm text-[var(--muted)]">Connecting…</div>
              )}
            </div>
          )}
        </div>

        {showPeople && <PeoplePanel participants={participants} localSid={room?.localParticipant.sid} onClose={() => setShowPeople(false)} />}
      </div>

      {/* controls */}
      <div className="relative flex items-center justify-center gap-2">
        <Control on={micOn} onClick={toggleMic} label={micOn ? "Mute" : "Unmute"} danger={!micOn}>
          {micOn ? <MicIcon /> : <MicOffIcon />}
        </Control>
        <Control on={camOn} onClick={toggleCam} label={camOn ? "Stop video" : "Start video"} danger={!camOn}>
          {camOn ? <CamIcon /> : <CamOffIcon />}
        </Control>
        <Control on={sharing} onClick={toggleShare} label={sharing ? "Stop sharing" : "Share screen"}>
          <ScreenIcon />
        </Control>
        <Control on={captionsOn} onClick={() => setCaptionsOn((c) => !c)} label={captionsOn ? "Captions on" : "Captions off"}>
          <CaptionsIcon />
        </Control>
        <Control on={showPeople} onClick={() => setShowPeople((p) => !p)} label="Participants">
          <PeopleIcon />
        </Control>
        <div className="relative">
          <Control on={showSettings} onClick={() => setShowSettings((s) => !s)} label="Devices">
            <SettingsIcon />
          </Control>
          {showSettings && <DeviceSettings room={room} onClose={() => setShowSettings(false)} />}
        </div>
        <button
          onClick={leave}
          className="ml-2 inline-flex items-center gap-2 rounded-full bg-[#C0442E] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          <LeaveIcon size={18} /> Leave
        </button>
      </div>
    </div>
  );
}

// ---- helpers ----
function publicationBySource(p: Participant, source: Track.Source): TrackPublication | undefined {
  return Array.from(p.trackPublications.values()).find((pub) => pub.source === source && !!pub.track);
}
function activeSpeakerOf(participants: Participant[], speaking: Set<string>): Participant {
  return participants.find((p) => speaking.has(p.sid)) ?? participants[0];
}
function gridCols(n: number): string {
  if (n <= 1) return "grid-cols-1";
  if (n === 2) return "grid-cols-1 sm:grid-cols-2";
  if (n <= 4) return "grid-cols-1 sm:grid-cols-2";
  if (n <= 9) return "grid-cols-2 lg:grid-cols-3";
  return "grid-cols-2 lg:grid-cols-4";
}
function fmtDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function IconChip({ children, onClick, title, disabled }: { children: React.ReactNode; onClick: () => void; title: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="inline-flex items-center justify-center rounded-[var(--radius-input)] border px-2 py-1 text-[var(--muted)] transition hover:text-[var(--fg)] disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Control({ children, on, onClick, label, danger }: { children: React.ReactNode; on: boolean; onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={on}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-full border transition",
        danger
          ? "border-[#C0442E]/40 bg-[#C0442E]/10 text-[#C0442E]"
          : on
            ? "border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg)]"
            : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)]",
      )}
    >
      {children}
    </button>
  );
}

function ParticipantTile({
  participant,
  source,
  speaking,
  big,
}: {
  participant: Participant | undefined;
  source: Track.Source;
  speaking: boolean;
  big?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    if (!participant) return;
    const pubs = Array.from(participant.trackPublications.values()) as TrackPublication[];
    const vidPub = pubs.find((p) => p.source === source && p.track);
    const micPub = pubs.find((p) => p.source === Track.Source.Microphone && p.track);
    const isLocal = participant.isLocal;

    if (vidPub?.track && videoRef.current) {
      vidPub.track.attach(videoRef.current);
      setHasVideo(!vidPub.isMuted);
    } else {
      setHasVideo(false);
    }
    if (micPub?.track && audioRef.current && !isLocal) micPub.track.attach(audioRef.current);
    return () => {
      vidPub?.track?.detach();
      micPub?.track?.detach();
    };
  });

  if (!participant) return <div className="h-full w-full rounded-[var(--radius-card)] border bg-[#0A0A0A]" />;

  const isLocal = participant.isLocal;
  const name = (participant.name || participant.identity || "?") + (isLocal ? " (you)" : "");
  const micEnabled = participant.isMicrophoneEnabled;

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-[var(--radius-card)] border bg-[#0A0A0A] ring-2 transition",
        speaking ? "ring-[#2E7D4F]" : "ring-transparent",
      )}
    >
      <video ref={videoRef} autoPlay playsInline muted={isLocal || source === Track.Source.ScreenShare} className={cn("h-full w-full", source === Track.Source.ScreenShare ? "object-contain" : "object-cover", hasVideo ? "block" : "hidden")} />
      {!hasVideo && (
        <div className="flex h-full min-h-[120px] w-full items-center justify-center">
          <span
            className={cn("inline-flex items-center justify-center rounded-full font-medium text-white", big ? "h-24 w-24 text-3xl" : "h-14 w-14 text-lg")}
            style={{ backgroundColor: "#2E7D4F" }}
          >
            {(participant.name || participant.identity || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
          </span>
        </div>
      )}
      <audio ref={audioRef} autoPlay />
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
        {!micEnabled && <MicOffIcon size={12} />}
        <span>{name}</span>
      </div>
    </div>
  );
}

function PeoplePanel({ participants, localSid, onClose }: { participants: Participant[]; localSid?: string; onClose: () => void }) {
  return (
    <aside className="flex w-72 shrink-0 flex-col rounded-[var(--radius-card)] border bg-[var(--surface)]">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-medium">Participants · {participants.length}</span>
        <button onClick={onClose} className="text-sm text-[var(--muted)] hover:text-[var(--fg)]">✕</button>
      </header>
      <div className="flex-1 overflow-y-auto p-2">
        {participants.map((p) => (
          <div key={p.sid} className="flex items-center gap-2 rounded-[var(--radius-input)] px-2 py-1.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium text-white" style={{ backgroundColor: "#2E7D4F" }}>
              {(p.name || p.identity || "?").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">
              {p.name || p.identity}
              {p.sid === localSid && <span className="text-[var(--muted)]"> (you)</span>}
            </span>
            <span className="text-[var(--muted)]">{p.isMicrophoneEnabled ? <MicIcon size={15} /> : <MicOffIcon size={15} />}</span>
            <span className="text-[var(--muted)]">{p.isCameraEnabled ? <CamIcon size={15} /> : <CamOffIcon size={15} />}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

function DeviceSettings({ room, onClose }: { room: Room | null; onClose: () => void }) {
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    navigator.mediaDevices
      ?.enumerateDevices()
      .then((list) => {
        setCams(list.filter((d) => d.kind === "videoinput"));
        setMics(list.filter((d) => d.kind === "audioinput"));
      })
      .catch(() => {});
  }, []);

  async function pick(kind: "videoinput" | "audioinput", id: string) {
    try {
      await room?.switchActiveDevice(kind, id);
    } catch { /* noop */ }
  }

  return (
    <div className="absolute bottom-14 left-1/2 z-20 w-72 -translate-x-1/2 rounded-[var(--radius-card)] border bg-[var(--bg)] p-3 shadow-xl">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">Devices</span>
        <button onClick={onClose} className="text-xs text-[var(--muted)] hover:text-[var(--fg)]">Close</button>
      </div>
      <label className="mb-1 block text-xs text-[var(--muted)]">Camera</label>
      <select onChange={(e) => pick("videoinput", e.target.value)} className="mb-3 w-full rounded-[var(--radius-input)] border bg-[var(--bg)] px-2 py-1.5 text-sm outline-none">
        {cams.length === 0 && <option>Default</option>}
        {cams.map((c) => <option key={c.deviceId} value={c.deviceId}>{c.label || "Camera"}</option>)}
      </select>
      <label className="mb-1 block text-xs text-[var(--muted)]">Microphone</label>
      <select onChange={(e) => pick("audioinput", e.target.value)} className="w-full rounded-[var(--radius-input)] border bg-[var(--bg)] px-2 py-1.5 text-sm outline-none">
        {mics.length === 0 && <option>Default</option>}
        {mics.map((m) => <option key={m.deviceId} value={m.deviceId}>{m.label || "Microphone"}</option>)}
      </select>
    </div>
  );
}

// --- minimal Web Speech typings ---
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (ev: SpeechRecognitionEventLike) => void;
  onerror: (ev: unknown) => void;
  onend: () => void;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}
