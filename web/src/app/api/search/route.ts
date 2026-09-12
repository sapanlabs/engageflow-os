import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAccessibleClientIds } from "@/lib/data";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const clientIds = await getAccessibleClientIds();
  if (!q) return NextResponse.json({ data: [] });

  const [clients, projects, content, notes] = await Promise.all([
    db.client.findMany({
      where: { id: { in: clientIds }, name: { contains: q } },
      take: 5,
    }),
    db.project.findMany({
      where: { clientId: { in: clientIds }, name: { contains: q } },
      take: 5,
    }),
    db.content.findMany({
      where: { project: { clientId: { in: clientIds } }, title: { contains: q } },
      take: 6,
      include: { project: { include: { client: true } } },
    }),
    db.note.findMany({
      where: { clientId: { in: clientIds }, title: { contains: q } },
      take: 5,
    }),
  ]);

  const results = [
    ...clients.map((c) => ({ type: "Client", label: c.name, href: `/clients/${c.id}` })),
    ...projects.map((p) => ({ type: "Project", label: p.name, href: `/projects/${p.id}` })),
    ...content.map((c) => ({
      type: "Content",
      label: c.title,
      sub: c.project.client.name,
      href: `/content/${c.id}`,
    })),
    ...notes.map((n) => ({ type: "Note", label: n.title, href: `/notes/${n.id}` })),
  ];

  return NextResponse.json({ data: results });
}
