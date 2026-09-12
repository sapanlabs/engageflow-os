import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes, createCipheriv } from "node:crypto";

const db = new PrismaClient();

// Mirror of src/lib/crypto.ts so seeded secrets decrypt in the app.
const CRED_SECRET = process.env.CREDENTIAL_SECRET ?? process.env.SESSION_SECRET ?? "dev-credential-secret";
const CRED_KEY = scryptSync(CRED_SECRET, "engageflow-credential-salt", 32);
function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", CRED_KEY, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

// Same scheme as src/lib/auth.ts (salt:hash, scrypt). Kept inline because the
// seed runs outside a request and cannot import the next/headers-based module.
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
const DEMO_PW = hashPassword("demo1234");

// Deterministic placeholder media (Picsum seeds — descriptive, per taste-skill).
const img = (seed: string, w = 1200, h = 1200) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

async function main() {
  // Clean slate (dev only)
  await db.meeting.deleteMany();
  await db.messageReaction.deleteMany();
  await db.message.deleteMany();
  await db.channelMember.deleteMany();
  await db.channel.deleteMany();
  await db.notification.deleteMany();
  await db.activity.deleteMany();
  await db.comment.deleteMany();
  await db.contentVersion.deleteMany();
  await db.content.deleteMany();
  await db.project.deleteMany();
  await db.clientMember.deleteMany();
  await db.client.deleteMany();
  await db.user.deleteMany();
  await db.workspace.deleteMany();

  const workspace = await db.workspace.create({
    data: {
      name: "EngageFlow Studio",
      slug: "engageflow-studio",
      plan: "AGENCY",
      planStatus: "active",
      currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
  });

  // Team — realistic, locale-varied names (no "John Doe")
  const [nadia, marcus, priya, leo, tomas] = await Promise.all([
    db.user.create({ data: { workspaceId: workspace.id, name: "Nadia Okonkwo", email: "nadia@engageflow.media", role: "ADMIN", avatarColor: "#0A0A0A", passwordHash: DEMO_PW } }),
    db.user.create({ data: { workspaceId: workspace.id, name: "Marcus Feld", email: "marcus@engageflow.media", role: "CREATIVE_LEAD", avatarColor: "#2E7D4F", passwordHash: DEMO_PW } }),
    db.user.create({ data: { workspaceId: workspace.id, name: "Priya Raman", email: "priya@engageflow.media", role: "SOCIAL_MEDIA_MANAGER", avatarColor: "#2F6FEB", passwordHash: DEMO_PW } }),
    db.user.create({ data: { workspaceId: workspace.id, name: "Leo Marchetti", email: "leo@engageflow.media", role: "EDITOR", avatarColor: "#C9A227", passwordHash: DEMO_PW } }),
    db.user.create({ data: { workspaceId: workspace.id, name: "Tomas Alvarez", email: "tomas@northwind.co", role: "CLIENT", avatarColor: "#C0442E", passwordHash: DEMO_PW } }),
  ]);

  // Clients
  const northwind = await db.client.create({
    data: {
      workspaceId: workspace.id,
      name: "Northwind Coffee Roasters",
      industry: "Food & Beverage",
      contactName: "Tomas Alvarez",
      contactEmail: "tomas@northwind.co",
      status: "ACTIVE",
      members: {
        create: [
          { userId: marcus.id, role: "CREATIVE_LEAD" },
          { userId: priya.id, role: "SOCIAL_MEDIA_MANAGER" },
          { userId: leo.id, role: "EDITOR" },
          { userId: tomas.id, role: "CLIENT" },
        ],
      },
    },
  });

  const lumen = await db.client.create({
    data: {
      workspaceId: workspace.id,
      name: "Lumen Fitness",
      industry: "Health & Wellness",
      contactName: "Erin Whitfield",
      contactEmail: "erin@lumenfit.app",
      status: "ACTIVE",
      members: {
        create: [
          { userId: marcus.id, role: "CREATIVE_LEAD" },
          { userId: priya.id, role: "SOCIAL_MEDIA_MANAGER" },
        ],
      },
    },
  });

  // Project under Northwind
  const project = await db.project.create({
    data: {
      clientId: northwind.id,
      name: "Autumn Harvest Launch",
      description: "Seasonal single-origin campaign across Instagram and LinkedIn.",
      status: "IN_PROGRESS",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-10-15"),
    },
  });

  const project2 = await db.project.create({
    data: {
      clientId: lumen.id,
      name: "New Year Momentum",
      description: "Motivation-led reels series for Q1 sign-ups.",
      status: "PLANNING",
    },
  });

  // Content 1 — full lifecycle with 2 versions + pinned comment + changes requested
  const c1 = await db.content.create({
    data: {
      projectId: project.id,
      title: "Single-Origin Ethiopia — Feed Post",
      caption: "New season, new heights. Our Ethiopian Yirgacheffe lands Friday. ☕",
      platform: "INSTAGRAM_POST",
      style: "PRODUCT",
      tags: "coffee,launch,ethiopia",
      status: "CHANGES_REQUESTED",
      versions: {
        create: [
          { number: 1, mediaUrl: img("northwind-ethiopia-v1"), mediaType: "image", authorId: leo.id, notes: "First pass — hero bag on wood." },
          { number: 2, mediaUrl: img("northwind-ethiopia-v2"), mediaType: "image", authorId: leo.id, notes: "Brighter grade, logo repositioned." },
        ],
      },
    },
    include: { versions: true },
  });
  const c1v2 = c1.versions.find((v) => v.number === 2)!;
  await db.comment.create({
    data: {
      contentId: c1.id,
      versionId: c1v2.id,
      authorName: "Tomas Alvarez",
      body: "Love the direction. Can we move the logo slightly left so it clears the beans?",
      pinX: 0.42,
      pinY: 0.18,
    },
  });

  // Content 2 — a reel, in review
  await db.content.create({
    data: {
      projectId: project.id,
      title: "Roastery Behind-the-Scenes — Reel",
      caption: "60 seconds inside the roastery. Sound on. 🔥",
      platform: "INSTAGRAM_REEL",
      style: "REEL",
      tags: "bts,roastery",
      status: "IN_REVIEW",
      versions: {
        create: [{ number: 1, mediaUrl: img("northwind-roastery-reel", 1080, 1920), mediaType: "video", authorId: leo.id }],
      },
    },
  });

  // Content 3 — approved + scheduled
  await db.content.create({
    data: {
      projectId: project.id,
      title: "Founder Note — LinkedIn",
      caption: "Why we chase altitude: a note on sourcing at 2,000m.",
      platform: "LINKEDIN",
      style: "ANNOUNCEMENT",
      status: "SCHEDULED",
      scheduledAt: new Date("2026-09-19T09:00:00"),
      versions: {
        create: [{ number: 1, mediaUrl: img("northwind-founder-linkedin", 1200, 1000), mediaType: "image", authorId: leo.id, approved: true }],
      },
    },
  });

  // Content 4 — draft under Lumen
  await db.content.create({
    data: {
      projectId: project2.id,
      title: "Monday Reset — Story",
      caption: "Start heavy. Finish light.",
      platform: "INSTAGRAM_STORY",
      style: "QUOTE",
      status: "DRAFT",
      versions: {
        create: [{ number: 1, mediaUrl: img("lumen-monday-reset", 1080, 1920), mediaType: "image", authorId: leo.id }],
      },
    },
  });

  // Tasks on the Autumn Harvest project
  await db.task.createMany({
    data: [
      { projectId: project.id, title: "Shoot hero product photography", status: "DONE", position: 0, assigneeId: leo.id, dueDate: new Date("2026-09-08") },
      { projectId: project.id, title: "Draft launch captions", status: "IN_PROGRESS", position: 0, assigneeId: priya.id, dueDate: new Date("2026-09-15") },
      { projectId: project.id, title: "Edit roastery reel", status: "IN_PROGRESS", position: 1, assigneeId: leo.id, dueDate: new Date("2026-09-17") },
      { projectId: project.id, title: "Confirm publish schedule with client", status: "TODO", position: 0, assigneeId: priya.id, dueDate: new Date("2026-09-18") },
      { projectId: project.id, title: "Final approval round", status: "REVIEW", position: 0, assigneeId: marcus.id, dueDate: new Date("2026-09-22") },
    ],
  });

  // A scheduled meeting so the calendar shows a call too.
  await db.meeting.create({
    data: {
      workspaceId: workspace.id,
      clientId: northwind.id,
      projectId: project.id,
      roomName: "ef-seed-kickoff",
      title: "Autumn Harvest — weekly sync",
      status: "SCHEDULED",
      createdById: marcus.id,
      createdByName: "Marcus Feld",
      startedAt: new Date("2026-09-16T10:00:00"),
    },
  });

  // Notes (a brief with a sub-page)
  const brief = await db.note.create({
    data: {
      workspaceId: workspace.id,
      clientId: northwind.id,
      projectId: project.id,
      title: "Campaign Brief — Autumn Harvest",
      body: "# Goal\nDrive awareness for the Ethiopian single-origin launch.\n\n## Tone\nWarm, editorial, altitude-focused.\n\n## Channels\n- Instagram (post + reel)\n- LinkedIn (founder note)",
      authorId: marcus.id,
    },
  });
  await db.note.create({
    data: {
      workspaceId: workspace.id,
      clientId: northwind.id,
      projectId: project.id,
      parentId: brief.id,
      title: "Reel Script",
      body: "Hook: 'This bean traveled 2,000 meters up.'\nBeat 1: roastery doors open\nBeat 2: close-up pour\nCTA: Lands Friday.",
      authorId: leo.id,
    },
  });

  // Whiteboard elements on the project canvas
  await db.whiteboardElement.createMany({
    data: [
      { projectId: project.id, kind: "NOTE", x: 80, y: 80, text: "Moodboard: warm, high-altitude, morning light", color: "#FFE066" },
      { projectId: project.id, kind: "NOTE", x: 320, y: 140, text: "Hero shot = bag on reclaimed wood", color: "#A0E7A0" },
      { projectId: project.id, kind: "TEXT", x: 120, y: 300, text: "Autumn Harvest — Campaign Map", color: "#0A0A0A" },
      { projectId: project.id, kind: "RECT", x: 300, y: 320, width: 220, height: 140, text: "Phase 1: Tease", color: "#BFD7FF" },
    ],
  });

  // Assets
  await db.asset.createMany({
    data: [
      { workspaceId: workspace.id, clientId: northwind.id, projectId: project.id, name: "brand-guidelines.pdf", url: "/uploads/sample-brand-guidelines.pdf", mimeType: "application/pdf", size: 248000, uploaderId: marcus.id },
      { workspaceId: workspace.id, clientId: northwind.id, projectId: project.id, name: "logo-primary.png", url: img("northwind-logo", 400, 400), mimeType: "image/png", size: 54000, uploaderId: leo.id },
    ],
  });

  // Platform accounts / credentials for Northwind
  await db.platformAccount.createMany({
    data: [
      { clientId: northwind.id, platform: "INSTAGRAM", label: "Main handle", handle: "@northwind.coffee", url: "https://instagram.com/northwind.coffee", username: "social@northwind.co", secretEnc: encryptSecret("nw-ig-app-pw-8842"), notes: "App-specific password. 2FA via team phone." },
      { clientId: northwind.id, platform: "LINKEDIN", label: "Company page", handle: "Northwind Coffee Roasters", url: "https://linkedin.com/company/northwind-coffee", username: "erin@northwind.co", secretEnc: encryptSecret("nw-li-9931-token"), notes: "Erin is page admin; we have editor access." },
      { clientId: northwind.id, platform: "WEBSITE", label: "CMS", handle: "", url: "https://admin.northwind.co", username: "studio@engageflow.media", secretEnc: encryptSecret("cms-access-4417"), notes: "Contributor role only." },
    ],
  });

  // Activity feed
  await db.activity.createMany({
    data: [
      { workspaceId: workspace.id, actorId: leo.id, actorName: "Leo Marchetti", verb: "uploaded Version 2", entityType: "version", entityId: c1v2.id, contentId: c1.id },
      { workspaceId: workspace.id, actorId: tomas.id, actorName: "Tomas Alvarez", verb: "requested changes", entityType: "content", entityId: c1.id, contentId: c1.id },
      { workspaceId: workspace.id, actorId: marcus.id, actorName: "Marcus Feld", verb: "created project Autumn Harvest Launch", entityType: "project", entityId: project.id },
    ],
  });

  await db.notification.createMany({
    data: [
      { userId: leo.id, title: "Changes requested", body: "Tomas requested changes on Single-Origin Ethiopia.", href: `/content/${c1.id}` },
      { userId: priya.id, title: "Ready to review", body: "Roastery BTS Reel is in review.", read: true },
    ],
  });

  // --- Chat: channels + a lifelike conversation incl. Heisenberg ---
  const team = [nadia, marcus, priya, leo];

  const general = await db.channel.create({
    data: {
      workspaceId: workspace.id,
      name: "general",
      topic: "Company-wide announcements and general chatter.",
      createdById: nadia.id,
      members: { create: team.map((u) => ({ userId: u.id })) },
    },
  });
  await db.channel.create({
    data: {
      workspaceId: workspace.id,
      name: "random",
      topic: "Non-work banter.",
      createdById: nadia.id,
      members: { create: team.map((u) => ({ userId: u.id })) },
    },
  });

  // A client/project-scoped channel (only Northwind members see it).
  const campaign = await db.channel.create({
    data: {
      workspaceId: workspace.id,
      clientId: northwind.id,
      projectId: project.id,
      name: "autumn-harvest",
      topic: "Northwind — Autumn Harvest launch.",
      createdById: marcus.id,
      members: { create: [marcus, priya, leo].map((u) => ({ userId: u.id })) },
    },
  });

  const mkMsg = (
    channelId: string,
    author: { id: string; name: string; avatarColor: string } | null,
    body: string,
    createdAt: Date,
    mentions?: string,
  ) =>
    db.message.create({
      data: {
        channelId,
        authorId: author?.id ?? null,
        authorName: author?.name ?? "Heisenberg",
        authorKind: author ? "USER" : "ASSISTANT",
        authorColor: author?.avatarColor ?? "#2E7D4F",
        body,
        mentions: mentions ?? null,
        createdAt,
      },
    });

  const base = Date.now() - 1000 * 60 * 60 * 3;
  const t = (min: number) => new Date(base + min * 60 * 1000);

  await mkMsg(general.id, nadia, "Morning team. Autumn Harvest is our focus this week. Let's keep client review tight.", t(0));
  await mkMsg(general.id, priya, "On it. Captions for the Ethiopia post are drafted, sending for review today.", t(2));
  await mkMsg(general.id, leo, "V2 of the hero shot is up. Repositioned the logo per Tomas' note.", t(5));

  await mkMsg(campaign.id, marcus, "Kicking off the launch channel. Brief is pinned in Notes.", t(10));
  await mkMsg(campaign.id, priya, "@heisenberg what's a strong hook for the Ethiopian single-origin reel?", t(12), "heisenberg");
  await mkMsg(
    campaign.id,
    null,
    "A few hooks that lead with altitude and craft:\n- \"Grown at 2,000 meters. Roasted for the mornings that matter.\"\n- \"This bean traveled higher than most flights.\"\n- \"Single-origin Ethiopia. Bright, floral, gone by Friday.\"\nWant these tuned for Reels captions or on-screen text?",
    t(12.5),
  );
  await mkMsg(campaign.id, leo, "The first one is great. I'll drop it as the opening card.", t(15));

  console.log("Seed complete:");
  console.log(`  workspace: ${workspace.name}`);
  console.log(`  users: 5, clients: 2, projects: 2, content: 4`);
  const previews = await db.content.findMany({ select: { title: true, previewToken: true } });
  previews.forEach((p) => console.log(`  preview: /preview/${p.previewToken}  (${p.title})`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
