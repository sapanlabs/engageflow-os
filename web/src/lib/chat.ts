import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspace, getAccessibleClientIds } from "@/lib/data";
import { publish } from "@/lib/realtime";
import { HEISENBERG, MESSAGE_KIND, mentionsHeisenberg } from "@/lib/constants";
import { AppError, Errors } from "@/lib/errors";
import type { Prisma } from "@prisma/client";

// ============================================================================
// Chat service layer — the single place chat logic lives, shared by the REST
// APIs and any server component. RBAC mirrors src/lib/data.ts.
// ============================================================================

export type ChannelRow = Prisma.ChannelGetPayload<{ include: { members: true } }>;

// Can the current user see/participate in a given channel?
//  - private channel  -> must be an explicit member
//  - client-scoped    -> must have access to that client (data.ts rules)
//  - general channel  -> any team member in the workspace
export async function canAccessChannel(
  channel: { isPrivate: boolean; clientId: string | null; workspaceId: string; members?: { userId: string }[] },
  userId: string,
  accessibleClientIds: string[],
): Promise<boolean> {
  if (channel.isPrivate) {
    const members = channel.members ?? (await db.channelMember.findMany({ where: { channelId: (channel as ChannelRow).id }, select: { userId: true } }));
    return members.some((m) => m.userId === userId);
  }
  if (channel.clientId) return accessibleClientIds.includes(channel.clientId);
  return true;
}

export async function assertChannelAccess(channelId: string) {
  const user = await getCurrentUser();
  if (!user) throw Errors.unauthorized();
  const channel = await db.channel.findUnique({ where: { id: channelId }, include: { members: true } });
  if (!channel) throw Errors.notFound("Channel not found");
  const clientIds = await getAccessibleClientIds();
  if (!(await canAccessChannel(channel, user.id, clientIds))) throw Errors.forbidden();
  return { user, channel };
}

// All channels the current user can see, with unread counts + last activity.
export async function getChannelsForUser() {
  const user = await getCurrentUser();
  if (!user) return [];
  const ws = await getWorkspace();
  const clientIds = await getAccessibleClientIds();

  const channels = await db.channel.findMany({
    where: { workspaceId: ws.id, archived: false },
    include: { members: true },
    orderBy: { createdAt: "asc" },
  });

  const visible = [];
  for (const ch of channels) {
    if (!(await canAccessChannel(ch, user.id, clientIds))) continue;
    const membership = ch.members.find((m) => m.userId === user.id);
    const [last, unread] = await Promise.all([
      db.message.findFirst({ where: { channelId: ch.id, parentId: null }, orderBy: { createdAt: "desc" } }),
      db.message.count({
        where: {
          channelId: ch.id,
          parentId: null,
          authorId: { not: user.id },
          ...(membership?.lastReadAt ? { createdAt: { gt: membership.lastReadAt } } : {}),
        },
      }),
    ]);
    visible.push({
      id: ch.id,
      kind: ch.kind,
      name: ch.name,
      topic: ch.topic,
      isPrivate: ch.isPrivate,
      clientId: ch.clientId,
      projectId: ch.projectId,
      memberCount: ch.members.length,
      lastMessageAt: last?.createdAt ?? ch.createdAt,
      lastMessagePreview: last ? previewOf(last.authorName, last.body) : null,
      unread,
    });
  }
  visible.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  return visible;
}

function previewOf(author: string, body: string): string {
  const clean = body.replace(/\s+/g, " ").trim();
  return `${author}: ${clean.length > 60 ? clean.slice(0, 60) + "…" : clean}`;
}

// --- message DTO (grouped reactions + resolved mention names) ---
type MessageWithReactions = Prisma.MessageGetPayload<{ include: { reactions: true; _count: { select: { replies: true } } } }>;

export function messageDTO(m: MessageWithReactions, viewerId: string) {
  const grouped: Record<string, { emoji: string; count: number; mine: boolean }> = {};
  for (const r of m.reactions) {
    const g = (grouped[r.emoji] ??= { emoji: r.emoji, count: 0, mine: false });
    g.count += 1;
    if (r.userId === viewerId) g.mine = true;
  }
  return {
    id: m.id,
    channelId: m.channelId,
    parentId: m.parentId,
    authorId: m.authorId,
    authorName: m.authorName,
    authorKind: m.authorKind,
    authorColor: m.authorColor,
    body: m.body,
    mentions: m.mentions ? m.mentions.split(",").filter(Boolean) : [],
    reactions: Object.values(grouped),
    replyCount: m._count.replies,
    createdAt: m.createdAt,
    editedAt: m.editedAt,
  };
}

export type MessageDTO = ReturnType<typeof messageDTO>;

export async function listMessages(channelId: string, opts: { parentId?: string | null; before?: string; take?: number } = {}) {
  const { user } = await assertChannelAccess(channelId);
  const take = Math.min(opts.take ?? 50, 100);
  const rows = await db.message.findMany({
    where: {
      channelId,
      parentId: opts.parentId === undefined ? null : opts.parentId,
      ...(opts.before ? { createdAt: { lt: new Date(opts.before) } } : {}),
    },
    include: { reactions: true, _count: { select: { replies: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.reverse().map((m) => messageDTO(m, user.id));
}

// Resolve @mention handles in the text to userIds for this workspace.
async function resolveMentions(workspaceId: string, body: string): Promise<string[]> {
  const ids = new Set<string>();
  if (mentionsHeisenberg(body)) ids.add(HEISENBERG.id);
  const handles = [...body.matchAll(/@([a-z0-9._-]+)/gi)].map((m) => m[1].toLowerCase());
  if (handles.length) {
    const users = await db.user.findMany({ where: { workspaceId }, select: { id: true, name: true, email: true } });
    for (const h of handles) {
      const match = users.find(
        (u) => u.email.split("@")[0].toLowerCase() === h || u.name.toLowerCase().replace(/\s+/g, "") === h.replace(/\s+/g, ""),
      );
      if (match) ids.add(match.id);
    }
  }
  return [...ids];
}

// Post a message as the current user. Returns the DTO. Fans out over realtime.
// If @heisenberg is mentioned, the assistant reply is triggered asynchronously.
export async function postMessage(channelId: string, body: string, parentId?: string | null) {
  const { user, channel } = await assertChannelAccess(channelId);
  const text = body.trim();
  if (!text) throw Errors.badRequest("Message cannot be empty");
  if (text.length > 4000) throw Errors.badRequest("Message too long");

  const mentions = await resolveMentions(channel.workspaceId, text);
  const created = await db.message.create({
    data: {
      channelId,
      parentId: parentId ?? null,
      authorId: user.id,
      authorName: user.name,
      authorKind: MESSAGE_KIND.USER,
      authorColor: user.avatarColor,
      body: text,
      mentions: mentions.join(",") || null,
    },
    include: { reactions: true, _count: { select: { replies: true } } },
  });
  await db.channel.update({ where: { id: channelId }, data: { updatedAt: new Date() } });

  const dto = messageDTO(created, user.id);
  publish({ type: "message.new", channelId, message: dto });
  await notifyMentions(channel, mentions, user.name, text, channelId);

  return { dto, mentionsHeisenberg: mentions.includes(HEISENBERG.id), channel, question: text };
}

// Post a message AS Heisenberg (assistant). Used by the AI reply + meeting bot.
export async function postAssistantMessage(channelId: string, body: string, parentId?: string | null) {
  const created = await db.message.create({
    data: {
      channelId,
      parentId: parentId ?? null,
      authorId: null,
      authorName: HEISENBERG.name,
      authorKind: MESSAGE_KIND.ASSISTANT,
      authorColor: HEISENBERG.color,
      body,
    },
    include: { reactions: true, _count: { select: { replies: true } } },
  });
  await db.channel.update({ where: { id: channelId }, data: { updatedAt: new Date() } });
  const dto = messageDTO(created, "");
  publish({ type: "message.new", channelId, message: dto });
  return dto;
}

async function notifyMentions(
  channel: { name: string },
  mentions: string[],
  fromName: string,
  body: string,
  channelId: string,
) {
  const userIds = mentions.filter((m) => m !== HEISENBERG.id);
  if (!userIds.length) return;
  await db.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      title: `${fromName} mentioned you in #${channel.name}`,
      body: body.length > 90 ? body.slice(0, 90) + "…" : body,
      href: `/chat/${channelId}`,
    })),
  });
}

export async function toggleReaction(messageId: string, emoji: string) {
  const user = await getCurrentUser();
  if (!user) throw Errors.unauthorized();
  const msg = await db.message.findUnique({ where: { id: messageId }, select: { channelId: true } });
  if (!msg) throw Errors.notFound("Message not found");
  await assertChannelAccess(msg.channelId);

  const existing = await db.messageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId: user.id, emoji } },
  });
  if (existing) {
    await db.messageReaction.delete({ where: { id: existing.id } });
  } else {
    await db.messageReaction.create({ data: { messageId, userId: user.id, emoji } });
  }
  const fresh = await db.message.findUnique({
    where: { id: messageId },
    include: { reactions: true, _count: { select: { replies: true } } },
  });
  const dto = fresh ? messageDTO(fresh, user.id) : null;
  publish({ type: "reaction.update", channelId: msg.channelId, messageId, reactions: dto?.reactions ?? [] });
  return dto;
}

export async function markRead(channelId: string) {
  const { user } = await assertChannelAccess(channelId);
  await db.channelMember.upsert({
    where: { channelId_userId: { channelId, userId: user.id } },
    create: { channelId, userId: user.id, lastReadAt: new Date() },
    update: { lastReadAt: new Date() },
  });
  return true;
}

export function slugifyChannelName(raw: string): string {
  return raw.trim().replace(/^#/, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

// Idempotently create (or return) the channel that belongs to a project. Called
// when a project is created, and lazily when its chat tab is first opened, so
// existing projects backfill a channel too. Members = the client's team
// (everyone with access to the client, excluding CLIENT-role contacts).
export async function ensureProjectChannel(projectId: string, creatorId?: string | null) {
  const existing = await db.channel.findFirst({ where: { projectId } });
  if (existing) return existing;

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { client: { include: { members: true } } },
  });
  if (!project) return null;

  const memberUserIds = new Set<string>(
    project.client.members.filter((m) => m.role !== "CLIENT").map((m) => m.userId),
  );
  if (creatorId) memberUserIds.add(creatorId);

  const channel = await db.channel.create({
    data: {
      workspaceId: project.client.workspaceId,
      clientId: project.clientId,
      projectId: project.id,
      name: slugifyChannelName(project.name) || "project",
      topic: `${project.client.name} — ${project.name}`,
      createdById: creatorId ?? null,
      members: { create: [...memberUserIds].map((userId) => ({ userId })) },
    },
  });
  await postAssistantMessage(
    channel.id,
    `👋 Welcome to **${project.name}**. This channel was created with the project and includes the whole project team. Tag @heisenberg anytime, or start a call from the header.`,
  );
  publish({ type: "channel.new", channelId: channel.id, channel: { id: channel.id, name: channel.name } });
  return channel;
}

export async function createChannel(input: {
  name: string;
  topic?: string;
  isPrivate?: boolean;
  clientId?: string | null;
  projectId?: string | null;
  memberIds?: string[];
}) {
  const user = await getCurrentUser();
  if (!user) throw Errors.unauthorized();
  const ws = await getWorkspace();
  const name = slugifyChannelName(input.name);
  if (!name) throw Errors.badRequest("Channel name required");

  if (input.clientId) {
    const clientIds = await getAccessibleClientIds();
    if (!clientIds.includes(input.clientId)) throw Errors.forbidden();
  }

  const memberIds = new Set<string>([user.id, ...(input.memberIds ?? [])]);
  const channel = await db.channel.create({
    data: {
      workspaceId: ws.id,
      clientId: input.clientId ?? null,
      projectId: input.projectId ?? null,
      name,
      topic: input.topic?.trim() || null,
      isPrivate: !!input.isPrivate,
      createdById: user.id,
      members: { create: [...memberIds].map((userId) => ({ userId })) },
    },
    include: { members: true },
  });
  publish({ type: "channel.new", channelId: channel.id, channel: { id: channel.id, name: channel.name } });
  return channel;
}

// Idempotently ensure a workspace has its starter channels. Safe to call often.
export async function ensureDefaultChannels() {
  const ws = await getWorkspace();
  const count = await db.channel.count({ where: { workspaceId: ws.id } });
  if (count > 0) return;
  const users = await db.user.findMany({ where: { workspaceId: ws.id, role: { not: "CLIENT" } }, select: { id: true } });
  const defaults = [
    { name: "general", topic: "Company-wide announcements and general chatter." },
    { name: "random", topic: "Non-work banter." },
  ];
  for (const d of defaults) {
    await db.channel.create({
      data: {
        workspaceId: ws.id,
        name: d.name,
        topic: d.topic,
        members: { create: users.map((u) => ({ userId: u.id })) },
      },
    });
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}
