import Link from "next/link";
import { getDashboardData } from "@/lib/data";
import { Card, StatusBadge, Avatar, SectionLabel } from "@/components/ui";
import { PLATFORM_LABELS } from "@/lib/constants";
import { timeAgo } from "@/lib/utils";

export default async function DashboardPage() {
  const { stats, activity, recentContent } = await getDashboardData();

  const cards = [
    { label: "Clients", value: stats.clients, href: "/clients" },
    { label: "Projects", value: stats.projects, href: "/clients" },
    { label: "Content pieces", value: stats.content, href: "/content" },
    { label: "Pending approvals", value: stats.pendingApprovals, href: "/content" },
  ];

  return (
    <div className="flex flex-col gap-10">
      <div>
        <SectionLabel>Overview</SectionLabel>
        <h1 className="font-display mt-1 text-4xl">Good to see you.</h1>
        <p className="mt-2 text-[var(--muted)]">
          Here is where everything stands across the studio today.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href}>
            <Card className="transition-quiet p-5 hover:border-[var(--fg)]/20">
              <p className="text-sm text-[var(--muted)]">{c.label}</p>
              <p className="font-display mt-2 text-4xl">{c.value}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl">Recent content</h2>
            <Link href="/content" className="text-sm text-[var(--muted)] hover:text-[var(--fg)]">
              View all
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {recentContent.map((c) => (
              <Link key={c.id} href={`/content/${c.id}`}>
                <Card className="transition-quiet overflow-hidden hover:border-[var(--fg)]/20">
                  {c.versions[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.versions[0].mediaUrl}
                      alt={c.title}
                      className="aspect-[16/10] w-full object-cover"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="mt-1 truncate text-xs text-[var(--muted)]">
                      {c.project.client.name} · {PLATFORM_LABELS[c.platform]}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display mb-4 text-2xl">Activity</h2>
          <Card className="divide-y">
            {activity.length === 0 && (
              <p className="p-4 text-sm text-[var(--muted)]">No activity yet.</p>
            )}
            {activity.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-4">
                <Avatar name={a.actorName} />
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{a.actorName}</span>{" "}
                    <span className="text-[var(--muted)]">{a.verb}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{timeAgo(a.createdAt)}</p>
                </div>
              </div>
            ))}
          </Card>
        </section>
      </div>
    </div>
  );
}
