import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "node:crypto";

const db = new PrismaClient();

// Same scheme as src/lib/auth.ts (salt:hash, scrypt).
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const workspace = await db.workspace.upsert({
    where: { slug: "engageflow-studio" },
    update: {
      name: "EngageFlow Studio",
      plan: "AGENCY",
      planStatus: "active",
    },
    create: {
      name: "EngageFlow Studio",
      slug: "engageflow-studio",
      plan: "AGENCY",
      planStatus: "active",
      currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
  });

  // Team — 5 testing accounts with exact credentials
  const seedUsersData = [
    { name: "Albin", email: "albin@engageflow.media", password: "Login@albin123", role: "ADMIN", avatarColor: "#0A0A0A" },
    { name: "Sapan", email: "sapan@engageflow.media", password: "Login@sapan123", role: "CREATIVE_LEAD", avatarColor: "#2E7D4F" },
    { name: "Ritika", email: "ritika@engageflow.media", password: "Login@ritika123", role: "SOCIAL_MEDIA_MANAGER", avatarColor: "#2F6FEB" },
    { name: "Rupanjay", email: "rupanjay@engageflow.media", password: "Login@rupanjay123", role: "EDITOR", avatarColor: "#C9A227" },
    { name: "Priyendra", email: "priyendra@engageflow.media", password: "Login@priyendra123", role: "CLIENT", avatarColor: "#C0442E" },
  ];

  const allowedEmails = seedUsersData.map((u) => u.email);
  await db.user.deleteMany({
    where: {
      email: { notIn: allowedEmails },
    },
  });

  const userMap: Record<string, any> = {};

  for (const u of seedUsersData) {
    const passwordHash = hashPassword(u.password);
    const user = await db.user.upsert({
      where: { email: u.email },
      update: {
        workspaceId: workspace.id,
        name: u.name,
        role: u.role,
        avatarColor: u.avatarColor,
        passwordHash,
      },
      create: {
        workspaceId: workspace.id,
        name: u.name,
        email: u.email,
        role: u.role,
        avatarColor: u.avatarColor,
        passwordHash,
      },
    });
    userMap[u.name.toLowerCase()] = user;
  }

  // Purge ALL dummy data for a completely fresh start
  await db.meeting.deleteMany({ where: { workspaceId: workspace.id } });
  await db.messageReaction.deleteMany();
  await db.message.deleteMany();
  await db.channelMember.deleteMany();
  await db.channel.deleteMany({ where: { workspaceId: workspace.id } });
  await db.notification.deleteMany();
  await db.activity.deleteMany({ where: { workspaceId: workspace.id } });
  await db.comment.deleteMany();
  await db.contentVersion.deleteMany();
  await db.content.deleteMany();
  await db.task.deleteMany();
  await db.note.deleteMany({ where: { workspaceId: workspace.id } });
  await db.whiteboardElement.deleteMany();
  await db.asset.deleteMany({ where: { workspaceId: workspace.id } });
  await db.platformAccount.deleteMany();
  await db.project.deleteMany();
  await db.clientMember.deleteMany();
  await db.client.deleteMany({ where: { workspaceId: workspace.id } });

  // Default clean team channels
  const teamUsers = [userMap["albin"], userMap["sapan"], userMap["ritika"], userMap["rupanjay"]].filter(Boolean);

  await db.channel.create({
    data: {
      workspaceId: workspace.id,
      name: "general",
      topic: "Company-wide announcements and team chatter.",
      createdById: userMap["albin"].id,
      members: { create: teamUsers.map((u) => ({ userId: u.id })) },
    },
  });

  await db.channel.create({
    data: {
      workspaceId: workspace.id,
      name: "random",
      topic: "Non-work banter and watercooler chat.",
      createdById: userMap["albin"].id,
      members: { create: teamUsers.map((u) => ({ userId: u.id })) },
    },
  });

  console.log("Fresh seed complete:");
  console.log(`  workspace: ${workspace.name}`);
  console.log(`  users: 5 (testing accounts ready)`);
  console.log(`  all dummy clients, projects, posts & mock data purged.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
