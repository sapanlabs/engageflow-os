import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function getWorkspace() {
  const ws = await db.workspace.findFirst({ orderBy: { createdAt: "asc" } });
  if (!ws) throw new Error("No workspace found. Run `npm run db:seed`.");
  return ws;
}

// RBAC: which client ids the signed-in user may see.
// ADMIN → all clients in the workspace. Everyone else → clients they're a member of.
export async function getAccessibleClientIds(): Promise<string[]> {
  const user = await getCurrentUser();
  const ws = await getWorkspace();
  if (!user) return [];
  if (user.role === "ADMIN") {
    const all = await db.client.findMany({ where: { workspaceId: ws.id }, select: { id: true } });
    return all.map((c) => c.id);
  }
  const memberships = await db.clientMember.findMany({
    where: { userId: user.id },
    select: { clientId: true },
  });
  return memberships.map((m) => m.clientId);
}

// Guard: throw if the current user cannot access a given client.
export async function assertClientAccess(clientId: string) {
  const ids = await getAccessibleClientIds();
  if (!ids.includes(clientId)) throw new Error("Forbidden");
}

export async function getDashboardData() {
  const ws = await getWorkspace();
  const clientIds = await getAccessibleClientIds();
  const scope = { project: { clientId: { in: clientIds } } };
  const [clients, projects, content, pendingApprovals, activity] = await Promise.all([
    Promise.resolve(clientIds.length),
    db.project.count({ where: { clientId: { in: clientIds } } }),
    db.content.count({ where: scope }),
    db.content.count({ where: { ...scope, status: "IN_REVIEW" } }),
    db.activity.findMany({
      where: { workspaceId: ws.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const recentContent = await db.content.findMany({
    where: scope,
    orderBy: { updatedAt: "desc" },
    take: 6,
    include: {
      project: { include: { client: true } },
      versions: { orderBy: { number: "desc" }, take: 1 },
    },
  });

  return { ws, stats: { clients, projects, content, pendingApprovals }, activity, recentContent };
}

export async function getClients() {
  const clientIds = await getAccessibleClientIds();
  return db.client.findMany({
    where: { id: { in: clientIds } },
    orderBy: { createdAt: "asc" },
    include: {
      members: { include: { user: true } },
      _count: { select: { projects: true } },
    },
  });
}

export async function getClient(id: string) {
  const ids = await getAccessibleClientIds();
  if (!ids.includes(id)) return null;
  return db.client.findUnique({
    where: { id },
    include: {
      members: { include: { user: true } },
      projects: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { contents: true } } },
      },
    },
  });
}

export async function getProject(id: string) {
  const project = await db.project.findUnique({ where: { id }, select: { clientId: true } });
  if (!project) return null;
  const ids = await getAccessibleClientIds();
  if (!ids.includes(project.clientId)) return null;
  return db.project.findUnique({
    where: { id },
    include: {
      client: true,
      contents: {
        orderBy: { updatedAt: "desc" },
        include: { versions: { orderBy: { number: "desc" }, take: 1 } },
      },
    },
  });
}

export async function getContent(id: string) {
  const content = await db.content.findUnique({
    where: { id },
    include: {
      project: { include: { client: true } },
      versions: { orderBy: { number: "desc" }, include: { author: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: true },
      },
    },
  });
  if (!content) return null;
  const ids = await getAccessibleClientIds();
  if (!ids.includes(content.project.clientId)) return null;
  return content;
}

export async function getContentByToken(token: string) {
  return db.content.findUnique({
    where: { previewToken: token },
    include: {
      project: { include: { client: true } },
      versions: { orderBy: { number: "desc" }, include: { author: true } },
      comments: { orderBy: { createdAt: "asc" }, include: { author: true } },
    },
  });
}

export async function getUsers() {
  const ws = await getWorkspace();
  return db.user.findMany({ where: { workspaceId: ws.id }, orderBy: { name: "asc" } });
}
