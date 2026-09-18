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
  PeopleIcon, SettingsIcon, CopyIcon, LeaveIcon, GridIcon, SpotlightIcon, ChatIcon,
} from "@/components/meet/icons";
import type { TranscriptLine } from "@/components/meet/types";
import { DEFAULT_AUDIO_CONSTRAINTS } from "@/lib/use-media-permissions";
import { ChatPanel, type ChatMessage } from "@/components/meet/chat-panel";

type Layout = "grid" | "spotlight";

export function CallStage({
  meetingId,
  meName,
  initialMicOn = true,
  initialCamOn = true,
  onCaption,
  onLeave,
  showTranscript = false,
  onToggleTranscript,
  latestCaption,
}: {
  meetingId: string;
  meName: string;
  initialMicOn?: boolean;
  initialCamOn?: boolean;
  onCaption: (line: TranscriptLine) => void;
  onLeave: () => void;
  showTranscript?: boolean;
  onToggleTranscript?: () => void;
  latestCaption?: TranscriptLine | null;
}) {
  const roomRef = useRef<Room | null>(null);
  const [, rerender] = useReducer((x) => x + 1, 0);
  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const [reconnecting, setReconnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [micOn, setMicOn] = useState(initialMicOn);
  const [camOn, setCamOn] = useState(initialCamOn);
  const [sharing, setSharing] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [layout, setLayout] = useState<Layout>("grid");
  const [showPeople, setShowPeople] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadChat, setUnreadChat] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);

  const [speaking, setSpeaking] = useState<Set<string>>(new Set());
  const [elapsed, setElapsed] = useState(0);
  const joinedAt = useRef<number | null>(null);

  const showChatRef = useRef(showChat);
  useEffect(() => {
    showChatRef.current = showChat;
  }, [showChat]);

  const onLeaveRef = useRef(onLeave);
  useEffect(() => {
    onLeaveRef.current = onLeave;
  }, [onLeave]);

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
      .on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: Participant, _kind?: unknown, topic?: string) => {
        if (!topic || topic === "chat") {
          try {
            const str = new TextDecoder().decode(payload);
            const data = JSON.parse(str);
            if (data && data.text) {
              const msg: ChatMessage = {
                id: data.id || String(Date.now() + Math.random()),
                senderName: participant?.name || participant?.identity || data.senderName || "Participant",
                senderSid: participant?.sid,
                text: data.text,
                timestamp: data.timestamp || Date.now(),
                isLocal: false,
              };
              setChatMessages((prev) => [...prev, msg]);
              if (!showChatRef.current) {
                setUnreadChat((u) => u + 1);
              }
            }
          } catch { /* ignore non-JSON */ }
        }
      })
      .on(RoomEvent.Reconnecting, () => setReconnecting(true))
      .on(RoomEvent.Reconnected, () => setReconnecting(false))
      .on(RoomEvent.ConnectionStateChanged, (s: ConnectionState) => {
        setReconnecting(s === ConnectionState.Reconnecting);
      })
      .on(RoomEvent.Disconnected, () => {
        if (!cancelled) onLeaveRef.current();
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

        if (initialCamOn) {
          try {
            await room.localParticipant.setCameraEnabled(true);
            setCamOn(true);
          } catch {
            setCamOn(false);
          }
        } else {
          setCamOn(false);
        }

        try {
          await room.localParticipant.setMicrophoneEnabled(true, DEFAULT_AUDIO_CONSTRAINTS);
          const micPub = Array.from(room.localParticipant.trackPublications.values()).find(
            (pub) => pub.source === Track.Source.Microphone
          );
          if (!initialMicOn && micPub) {
            await micPub.mute();
          }
          setMicOn(initialMicOn);
        } catch {
          setMicOn(false);
        }

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
      const r = roomRef.current;
      if (r) {
        stopAndDisconnect(r);
        roomRef.current = null;
      }
    };
  }, [meetingId]);

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
    const micPub = Array.from(p.trackPublications.values()).find(
      (pub) => pub.source === Track.Source.Microphone
    );

    if (micPub) {
      if (micOn) {
        await micPub.mute();
        setMicOn(false);
      } else {
        await micPub.unmute();
        setMicOn(true);
      }
    } else {
      try {
        await p.setMicrophoneEnabled(true, DEFAULT_AUDIO_CONSTRAINTS);
        setMicOn(true);
      } catch { /* noop */ }
    }
  }

  async function toggleCam() {
    const p = roomRef.current?.localParticipant;
    if (!p) return;
    const camPub = Array.from(p.trackPublications.values()).find(
      (pub) => pub.source === Track.Source.Camera
    );

    if (camPub) {
      if (camOn) {
        await camPub.mute();
        setCamOn(false);
      } else {
        await camPub.unmute();
        setCamOn(true);
      }
    } else {
      try {
        await p.setCameraEnabled(true);
        setCamOn(true);
      } catch { /* noop */ }
    }
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

  function handleSendMessage(text: string) {
    const r = roomRef.current;
    const local = r?.localParticipant;
    const msgObj = {
      id: String(Date.now() + Math.random()),
      senderName: meName,
      text,
      timestamp: Date.now(),
    };
    if (local) {
      try {
        const data = new TextEncoder().encode(JSON.stringify(msgObj));
        local.publishData(data, { topic: "chat", reliable: true });
      } catch { /* ignore */ }
    }
    setChatMessages((prev) => [...prev, { ...msgObj, isLocal: true }]);
  }

  function togglePeople() {
    setShowPeople((prev) => {
      const next = !prev;
      if (next) setShowChat(false);
      return next;
    });
  }

  function toggleChat() {
    setShowChat((prev) => {
      const next = !prev;
      if (next) {
        setShowPeople(false);
        setUnreadChat(0);
      }
      return next;
    });
  }

  async function leave() {
    await fetch(`/api/meetings/${meetingId}/end`, { method: "POST" }).catch(() => {});
    const r = roomRef.current;
    if (r) {
      await stopAndDisconnect(r);
      roomRef.current = null;
    }
    onLeaveRef.current();
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
    <div className="flex flex-1 flex-col gap-3 overflow-hidden">
      {/* status bar */}
      <div className="flex shrink-0 items-center gap-3 text-xs text-[var(--muted)]">
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
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          {screenSharer ? (
            /* Requirement 2: Screen Sharing 80% / 20% Split - No scrolling */
            <div className="flex h-full flex-col gap-3 overflow-hidden">
              <div className="relative h-[80%] min-h-0 w-full overflow-hidden rounded-[var(--radius-card)] border bg-[#0A0A0A]">
                <ParticipantTile participant={screenSharer} source={Track.Source.ScreenShare} speaking={false} big />
              </div>
              <div className="flex h-[20%] min-h-0 shrink-0 items-center gap-2 overflow-hidden">
                {participants.slice(0, 4).map((p) => (
                  <div key={p.sid} className="h-full flex-1 min-w-0 aspect-video">
                    <ParticipantTile participant={p} source={Track.Source.Camera} speaking={speaking.has(p.sid)} />
                  </div>
                ))}
                {participants.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setShowPeople(true)}
                    className="flex h-full flex-1 min-w-0 aspect-video flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed bg-[var(--surface-2)] px-2 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--fg)]/40 hover:text-[var(--fg)]"
                  >
                    <span className="truncate">+{participants.length - 4} more</span>
                    <span className="mt-0.5 truncate text-[10px] text-[var(--accent)] underline">Show All</span>
                  </button>
                )}
              </div>
            </div>
          ) : effectiveLayout === "spotlight" ? (
            <div className="flex h-full flex-col gap-3 overflow-hidden">
              <div className="min-h-0 flex-1 overflow-hidden">
                <ParticipantTile participant={activeSpeakerOf(participants, speaking)} source={Track.Source.Camera} speaking big />
              </div>
              <div className="flex h-24 shrink-0 items-center gap-2 overflow-hidden">
                {participants.slice(0, 4).map((p) => (
                  <div key={p.sid} className="h-full flex-1 min-w-0 aspect-video">
                    <ParticipantTile participant={p} source={Track.Source.Camera} speaking={speaking.has(p.sid)} />
                  </div>
                ))}
                {participants.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setShowPeople(true)}
                    className="flex h-full flex-1 min-w-0 aspect-video flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed bg-[var(--surface-2)] px-2 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--fg)]/40 hover:text-[var(--fg)]"
                  >
                    <span className="truncate">+{participants.length - 4} more</span>
                    <span className="mt-0.5 truncate text-[10px] text-[var(--accent)] underline">Show All</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Requirement 3: Max 4 joined users in grid + "Show All" card if >4 */
            <div className={cn("grid h-full gap-3 overflow-hidden", gridCols(participants.length > 4 ? 5 : participants.length))}>
              {participants.slice(0, 4).map((p) => (
                <ParticipantTile key={p.sid} participant={p} source={Track.Source.Camera} speaking={speaking.has(p.sid)} />
              ))}
              {participants.length > 4 && (
                <button
                  type="button"
                  onClick={() => setShowPeople(true)}
                  className="flex h-full w-full min-h-0 flex-col items-center justify-center gap-1.5 rounded-[var(--radius-card)] border border-dashed bg-[var(--surface-2)] p-3 text-center transition hover:border-[var(--fg)]/40 hover:bg-[var(--surface)]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]/15 text-sm font-bold text-[var(--accent)]">
                    +{participants.length - 4}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--fg)]">+{participants.length - 4} More Participants</p>
                    <p className="mt-0.5 text-[11px] text-[var(--muted)]">View full participant list</p>
                    <span className="mt-1.5 inline-block rounded-full bg-[var(--accent)]/10 px-2.5 py-0.5 text-[11px] font-medium text-[var(--accent)]">
                      Show All →
                    </span>
                  </div>
                </button>
              )}
              {status === "connecting" && participants.length === 0 && (
                <div className="col-span-full flex items-center justify-center text-sm text-[var(--muted)]">Connecting…</div>
              )}
            </div>
          )}

          {/* Requirement 1: Collapsed Transcript Banner Pill at bottom */}
          {!showTranscript && (
            <button
              type="button"
              onClick={onToggleTranscript}
              className="group absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 max-w-lg items-center gap-2 rounded-full border border-[var(--border)] bg-black/80 px-4 py-2 text-xs text-white shadow-xl backdrop-blur transition hover:border-white/40 hover:bg-black"
            >
              <CaptionsIcon size={14} className="text-[#2E7D4F]" />
              {latestCaption ? (
                <div className="flex min-w-0 items-center gap-1.5 truncate">
                  <span className="font-semibold text-[#2E7D4F]">{latestCaption.speaker}:</span>
                  <span className="max-w-[260px] truncate text-white/90">{latestCaption.text}</span>
                </div>
              ) : (
                <span className="text-white/70">Live Transcript & AI Minutes (Collapsed)</span>
              )}
              <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white transition group-hover:bg-[var(--accent)]">
                EXPAND ▲
              </span>
            </button>
          )}
        </div>

        {showPeople && <PeoplePanel participants={participants} localSid={room?.localParticipant.sid} onClose={() => setShowPeople(false)} />}
        {showChat && <ChatPanel messages={chatMessages} onSendMessage={handleSendMessage} onClose={() => setShowChat(false)} />}
      </div>

      {/* Requirement 4: Properly arranged call controls in bottom 20% area */}
      <div className="relative flex items-center justify-center gap-2 py-1">
        <Control on={micOn} onClick={toggleMic} label={micOn ? "Mute" : "Unmute"} danger={!micOn}>
          {micOn ? <MicIcon /> : <MicOffIcon />}
        </Control>
        <Control on={camOn} onClick={toggleCam} label={camOn ? "Stop video" : "Start video"} danger={!camOn}>
          {camOn ? <CamIcon /> : <CamOffIcon />}
        </Control>
        <Control on={sharing} onClick={toggleShare} label={sharing ? "Stop sharing" : "Share screen"}>
          <ScreenIcon />
        </Control>
        <Control
          on={!!showTranscript}
          onClick={onToggleTranscript ?? (() => {})}
          label={showTranscript ? "Close transcript" : "Expand transcript"}
        >
          <CaptionsIcon />
        </Control>
        <div className="relative">
          <Control on={showPeople} onClick={togglePeople} label="Participants">
            <PeopleIcon />
          </Control>
          {participants.length > 0 && (
            <span className="pointer-events-none absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full border bg-[var(--surface-2)] px-1 text-[10px] font-bold text-[var(--fg)]">
              {participants.length}
            </span>
          )}
        </div>
        <div className="relative">
          <Control on={showChat} onClick={toggleChat} label="In-call chat">
            <ChatIcon />
          </Control>
          {unreadChat > 0 && !showChat && (
            <span className="pointer-events-none absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C0442E] px-1 text-[10px] font-bold text-white shadow-sm">
              {unreadChat}
            </span>
          )}
        </div>
        <div className="relative">
          <Control on={showSettings} onClick={() => setShowSettings((s) => !s)} label="Devices">
            <SettingsIcon />
          </Control>
          {showSettings && <DeviceSettings room={room} onClose={() => setShowSettings(false)} />}
        </div>
        <button
          type="button"
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
function stopAndDisconnect(room: Room | null) {
  if (!room) return;
  try {
    const local = room.localParticipant;
    if (local) {
      const pubs = Array.from(local.trackPublications.values());
      for (const pub of pubs) {
        if (pub.track) {
          try {
            pub.track.stop();
          } catch { /* ignore */ }
        }
      }
      local.setCameraEnabled(false).catch(() => {});
      local.setMicrophoneEnabled(false).catch(() => {});
      local.setScreenShareEnabled(false).catch(() => {});
    }
  } catch { /* ignore */ }
  try {
    room.disconnect();
  } catch { /* ignore */ }
}
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

  const pubs = participant ? (Array.from(participant.trackPublications.values()) as TrackPublication[]) : [];
  const vidPub = pubs.find((p) => p.source === source && p.track);
  const micPub = pubs.find((p) => p.source === Track.Source.Microphone && p.track);
  const isLocal = participant?.isLocal ?? false;

  const hasVideo = !!(vidPub?.track && !vidPub.isMuted);

  useEffect(() => {
    if (!participant) return;
    const videoEl = videoRef.current;
    const audioEl = audioRef.current;

    if (vidPub?.track && videoEl) {
      vidPub.track.attach(videoEl);
    }
    if (micPub?.track && audioEl && !isLocal) {
      micPub.track.attach(audioEl);
    }

    return () => {
      if (vidPub?.track && videoEl) {
        try {
          vidPub.track.detach(videoEl);
        } catch { /* ignore */ }
      }
      if (micPub?.track && audioEl) {
        try {
          micPub.track.detach(audioEl);
        } catch { /* ignore */ }
      }
    };
  }, [participant, source, vidPub?.track?.sid, micPub?.track?.sid, isLocal]);

  if (!participant) return <div className="h-full w-full rounded-[var(--radius-card)] border bg-[#0A0A0A]" />;

  const name = (participant.name || participant.identity || "?") + (isLocal ? " (you)" : "");
  const micEnabled = participant.isMicrophoneEnabled;

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-[var(--radius-card)] border bg-[#0A0A0A] ring-2 transition-all duration-200",
        speaking ? "ring-[#2E7D4F]" : "ring-transparent",
      )}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal || source === Track.Source.ScreenShare}
        className={cn("h-full w-full", source === Track.Source.ScreenShare ? "object-contain" : "object-cover", hasVideo ? "block" : "hidden")}
      />
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
