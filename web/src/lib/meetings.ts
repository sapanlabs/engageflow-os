import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspace, getAccessibleClientIds } from "@/lib/data";
import { assertChannelAccess, postAssistantMessage } from "@/lib/chat";
import { meetingMinutes } from "@/lib/ai/service";
import { publish } from "@/lib/realtime";
import { Errors } from "@/lib/errors";
import { randomBytes } from "node:crypto";

// URL-safe short id (no external dep).
function shortId(len = 10): string {
  return randomBytes(len).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, len);
}

// ============================================================================
// Meetings service — call rooms, transcripts, and Heisenberg-generated minutes.
// Reuses the same RBAC surface as chat (channel access) and clients (data.ts).
// ============================================================================

export type TranscriptLine = { speaker: string; text: string; ts: number };

export async function assertMeetingAccess(meetingId: string) {
  const user = await getCurrentUser();
  if (!user) throw Errors.unauthorized();
  const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) throw Errors.notFound("Meeting not found");
  // If the call belongs to a channel, channel access governs the call too. This
  // correctly gates private-group calls (which have no clientId). Falls back to
  // client-scope for standalone meetings, or workspace-team for unscoped ones.
  if (meeting.channelId) {
    await assertChannelAccess(meeting.channelId); // throws 403/404 if no access
  } else if (meeting.clientId) {
    const ids = await getAccessibleClientIds();
    if (!ids.includes(meeting.clientId)) throw Errors.forbidden();
  }
  return { user, meeting };
}

export async function createMeeting(input: {
  title?: string;
  channelId?: string | null;
  projectId?: string | null;
  clientId?: string | null;
}) {
  const user = await getCurrentUser();
  if (!user) throw Errors.unauthorized();
  const ws = await getWorkspace();

  let clientId = input.clientId ?? null;
  let projectId = input.projectId ?? null;

  // If tied to a channel, inherit its scope and verify access.
  if (input.channelId) {
    const { channel } = await assertChannelAccess(input.channelId);
    clientId = channel.clientId;
    projectId = channel.projectId;
  }
  if (clientId) {
    const ids = await getAccessibleClientIds();
    if (!ids.includes(clientId)) throw Errors.forbidden();
  }

  const meeting = await db.meeting.create({
    data: {
      workspaceId: ws.id,
      channelId: input.channelId ?? null,
      projectId,
      clientId,
      roomName: `ef-${shortId(10)}`,
      title: input.title?.trim() || "Untitled meeting",
      status: "LIVE",
      startedAt: new Date(),
      createdById: user.id,
      createdByName: user.name,
    },
  });

  // Drop a joinable card into the linked channel so the call feels native to chat.
  if (meeting.channelId) {
    await postAssistantMessage(
      meeting.channelId,
      `📹 ${user.name} started a call: **${meeting.title}**\nJoin: /meet/${meeting.id}`,
    );
    publish({ type: "meeting.update", channelId: meeting.channelId, meeting: { id: meeting.id, status: meeting.status } });
  }
  return meeting;
}

export async function appendTranscript(meetingId: string, lines: TranscriptLine[]) {
  const { meeting } = await assertMeetingAccess(meetingId);
  const existing: TranscriptLine[] = meeting.transcript ? JSON.parse(meeting.transcript) : [];
  const merged = [...existing, ...lines].sort((a, b) => a.ts - b.ts);
  await db.meeting.update({ where: { id: meetingId }, data: { transcript: JSON.stringify(merged) } });
  return merged;
}

export function transcriptToText(lines: TranscriptLine[]): string {
  return lines
    .map((l) => {
      const t = new Date(l.ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      return `[${t}] ${l.speaker}: ${l.text}`;
    })
    .join("\n");
}

export async function generateMinutes(meetingId: string) {
  const { meeting } = await assertMeetingAccess(meetingId);
  const lines: TranscriptLine[] = meeting.transcript ? JSON.parse(meeting.transcript) : [];
  if (!lines.length) throw Errors.badRequest("No transcript to summarize yet");
  const { minutes } = await meetingMinutes({ title: meeting.title, transcript: transcriptToText(lines) });
  const saved = await db.meeting.update({ where: { id: meetingId }, data: { minutes } });

  // Post the minutes back to the linked channel as Heisenberg.
  if (saved.channelId) {
    await postAssistantMessage(
      saved.channelId,
      `📝 **Minutes — ${saved.title}**\n\n${minutes}`,
    );
  }
  return minutes;
}

export async function endMeeting(meetingId: string) {
  const { meeting } = await assertMeetingAccess(meetingId);
  const ended = await db.meeting.update({
    where: { id: meetingId },
    data: { status: "ENDED", endedAt: new Date() },
  });
  if (ended.channelId) {
    publish({ type: "meeting.update", channelId: ended.channelId, meeting: { id: ended.id, status: ended.status } });
  }
  return ended;
}

export async function getMeeting(meetingId: string) {
  const { meeting } = await assertMeetingAccess(meetingId);
  const lines: TranscriptLine[] = meeting.transcript ? JSON.parse(meeting.transcript) : [];
  return { meeting, transcript: lines };
}
