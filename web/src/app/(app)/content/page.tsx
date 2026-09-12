import Link from "next/link";
import { db } from "@/lib/db";
import { getAccessibleClientIds } from "@/lib/data";
import { Card, StatusBadge, SectionLabel } from "@/components/ui";
import { CONTENT_STATUS_ORDER, CONTENT_STATUS_LABELS, PLATFORM_LABELS } from "@/lib/constants";

export default async function ContentPipelinePage() {
  const clientIds = await getAccessibleClientIds();
  const content = await db.content.findMany({
    where: { project: { clientId: { in: clientIds } } },
    orderBy: { updatedAt: "desc" },
    include: {
      project: { include: { client: true } },
      versions: { orderBy: { number: "desc" }, take: 1 },
    },
  });

  const byStatus = CONTENT_STATUS_ORDER.map((status) => ({
    status,
    items: content.filter((c) => c.status === status),
  }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionLabel>Content</SectionLabel>
        <h1 className="font-display mt-1 text-4xl">The pipeline</h1>
        <p className="mt-2 text-[var(--muted)]">
          Every piece of content, grouped by where it stands.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {byStatus.map((col) => (
          <div key={col.status} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <StatusBadge status={col.status} />
              <span className="text-xs text-[var(--muted)]">{col.items.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {col.items.length === 0 && (
                <p className="rounded-[var(--radius-card)] border border-dashed p-4 text-center text-xs text-[var(--muted)]">
                  Nothing in {CONTENT_STATUS_LABELS[col.status].toLowerCase()}
                </p>
              )}
              {col.items.map((c) => (
                <Link key={c.id} href={`/content/${c.id}`}>
                  <Card className="transition-quiet overflow-hidden hover:border-[var(--fg)]/20">
                    {c.versions[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.versions[0].mediaUrl}
                        alt={c.title}
                        className="aspect-[16/9] w-full object-cover"
                      />
                    )}
                    <div className="p-3">
                      <p className="text-sm font-medium leading-snug">{c.title}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {c.project.client.name} · {PLATFORM_LABELS[c.platform]}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
