import { db } from "@/lib/db";
import { getWorkspace } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { assertWithinLimit } from "@/lib/billing";
import { ensureProjectChannel } from "@/lib/chat";

// Business logic for the core loop. Framework-agnostic so both Server Actions
// and REST route handlers call the exact same code (no drift).

async function logActivity(params: {
  actorId?: string | null;
  actorName: string;
  verb: string;
  entityType: string;
  entityId: string;
  contentId?: string;
}) {
  const ws = await getWorkspace();
  await db.activity.create({ data: { workspaceId: ws.id, ...params } });
}

async function notify(userId: string, title: string, body?: string, href?: string) {
  await db.notification.create({ data: { userId, title, body, href } });
}

export async function createClient(input: {
  name: string;
  industry?: string;
  contactName?: string;
  contactEmail?: string;
}) {
  const ws = await getWorkspace();
  await assertWithinLimit("clients");
  const creator = await getCurrentUser();
  const client = await db.client.create({
    data: {
      workspaceId: ws.id,
      ...input,
      // Auto-add the creator as a member so they can see their own new client
      // (admins see everything anyway, but this keeps the team list correct).
      ...(creator && creator.role !== "CLIENT"
        ? { members: { create: { userId: creator.id, role: creator.role } } }
        : {}),
    },
  });
  await logActivity({
    actorName: "You",
    verb: `created client ${client.name}`,
    entityType: "client",
    entityId: client.id,
  });
  return client;
}

export async function createProject(input: {
  clientId: string;
  name: string;
  description?: string;
}) {
  await assertWithinLimit("projects");
  const project = await db.project.create({ data: input });
  await logActivity({
    actorName: "You",
    verb: `created project ${project.name}`,
    entityType: "project",
    entityId: project.id,
  });
  // Auto-create the project's team chat channel (members = the client's team).
  const creator = await getCurrentUser();
  await ensureProjectChannel(project.id, creator?.id).catch(() => null);
  return project;
}

export async function createContent(input: {
  projectId: string;
  title: string;
  caption?: string;
  platform: string;
  style: string;
  mediaUrl: string;
  mediaType?: string;
  authorId: string;
}) {
  const content = await db.content.create({
    data: {
      projectId: input.projectId,
      title: input.title,
      caption: input.caption,
      platform: input.platform,
      style: input.style,
      status: "DRAFT",
      versions: {
        create: {
          number: 1,
          mediaUrl: input.mediaUrl,
          mediaType: input.mediaType ?? "image",
          authorId: input.authorId,
        },
      },
    },
    include: { versions: true },
  });
  await logActivity({
    actorId: input.authorId,
    actorName: "Editor",
    verb: `created content ${content.title}`,
    entityType: "content",
    entityId: content.id,
    contentId: content.id,
  });
  return content;
}

export async function addVersion(input: {
  contentId: string;
  mediaUrl: string;
  mediaType?: string;
  notes?: string;
  authorId: string;
}) {
  const last = await db.contentVersion.findFirst({
    where: { contentId: input.contentId },
    orderBy: { number: "desc" },
  });
  const number = (last?.number ?? 0) + 1;
  const version = await db.contentVersion.create({
    data: {
      contentId: input.contentId,
      number,
      mediaUrl: input.mediaUrl,
      mediaType: input.mediaType ?? "image",
      notes: input.notes,
      authorId: input.authorId,
    },
    include: { author: true },
  });
  // A new version moves the content back into review.
  await db.content.update({
    where: { id: input.contentId },
    data: { status: "IN_REVIEW" },
  });
  await logActivity({
    actorId: input.authorId,
    actorName: version.author.name,
    verb: `uploaded Version ${number}`,
    entityType: "version",
    entityId: version.id,
    contentId: input.contentId,
  });
  return version;
}

export async function addComment(input: {
  contentId: string;
  versionId?: string;
  authorId?: string;
  authorName: string;
  body: string;
  pinX?: number;
  pinY?: number;
}) {
  return db.comment.create({ data: input });
}

export async function resolveComment(id: string, resolved: boolean) {
  return db.comment.update({ where: { id }, data: { resolved } });
}

export async function setStatus(contentId: string, status: string) {
  const content = await db.content.update({
    where: { id: contentId },
    data: { status },
  });
  await logActivity({
    actorName: "You",
    verb: `moved status to ${status.replace(/_/g, " ").toLowerCase()}`,
    entityType: "content",
    entityId: contentId,
    contentId,
  });
  return content;
}

export async function approveContent(contentId: string, byName = "Client") {
  const content = await db.content.findUnique({
    where: { id: contentId },
    include: { versions: { orderBy: { number: "desc" }, take: 1 }, project: { include: { client: { include: { members: true } } } } },
  });
  if (!content) throw new Error("Content not found");
  const latest = content.versions[0];
  if (latest) {
    await db.contentVersion.update({ where: { id: latest.id }, data: { approved: true } });
  }
  const updated = await db.content.update({ where: { id: contentId }, data: { status: "APPROVED" } });
  await logActivity({
    actorName: byName,
    verb: `approved Version ${latest?.number ?? 1}`,
    entityType: "content",
    entityId: contentId,
    contentId,
  });
  // Notify the editor(s) on this client
  const editors = content.project.client.members.filter((m) => m.role === "EDITOR");
  for (const e of editors) {
    await notify(e.userId, "Content approved", `${byName} approved "${content.title}".`, `/content/${contentId}`);
  }
  return updated;
}

export async function requestChanges(input: {
  contentId: string;
  body: string;
  byName?: string;
  versionId?: string;
  pinX?: number;
  pinY?: number;
}) {
  const content = await db.content.findUnique({
    where: { id: input.contentId },
    include: { project: { include: { client: { include: { members: true } } } } },
  });
  if (!content) throw new Error("Content not found");

  await db.comment.create({
    data: {
      contentId: input.contentId,
      versionId: input.versionId,
      authorName: input.byName ?? "Client",
      body: input.body,
      pinX: input.pinX,
      pinY: input.pinY,
    },
  });
  const updated = await db.content.update({
    where: { id: input.contentId },
    data: { status: "CHANGES_REQUESTED" },
  });
  await logActivity({
    actorName: input.byName ?? "Client",
    verb: "requested changes",
    entityType: "content",
    entityId: input.contentId,
    contentId: input.contentId,
  });
  const editors = content.project.client.members.filter((m) => m.role === "EDITOR");
  for (const e of editors) {
    await notify(e.userId, "Changes requested", `${input.byName ?? "Client"} requested changes on "${content.title}".`, `/content/${input.contentId}`);
  }
  return updated;
}

export async function scheduleContent(contentId: string, scheduledAt: Date) {
  return db.content.update({
    where: { id: contentId },
    data: { status: "SCHEDULED", scheduledAt },
  });
}
