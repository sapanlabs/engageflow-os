import { db } from "@/lib/db";
import { getAccessibleClientIds } from "@/lib/data";
import { Card, SectionLabel } from "@/components/ui";
import { BarChart, Donut } from "@/components/charts";
import { AnalyticsSummary } from "@/components/analytics-summary";
import {
  CONTENT_STATUS_ORDER,
  CONTENT_STATUS_LABELS,
  CONTENT_STATUS_COLORS,
  PLATFORM_LABELS,
} from "@/lib/constants";

export default async function AnalyticsPage() {
  const clientIds = await getAccessibleClientIds();
  const content = await db.content.findMany({
    where: { project: { clientId: { in: clientIds } } },
    select: { status: true, platform: true, createdAt: true },
  });

  // by status
  const statusSegments = CONTENT_STATUS_ORDER.map((s) => ({
    label: CONTENT_STATUS_LABELS[s],
    value: content.filter((c) => c.status === s).length,
    color: CONTENT_STATUS_COLORS[s],
  })).filter((s) => s.value > 0);

  // by platform
  const platformCounts = new Map<string, number>();
  for (const c of content) platformCounts.set(c.platform, (platformCounts.get(c.platform) ?? 0) + 1);
  const platformData = [...platformCounts.entries()].map(([p, v]) => ({
    label: PLATFORM_LABELS[p] ?? p,
    value: v,
  }));

  // over last 6 months
  const now = new Date();
  const months: { label: string; value: number; color?: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    months.push({
      label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(d),
      value: content.filter((c) => c.createdAt >= d && c.createdAt < next).length,
    });
  }

  const approved = content.filter((c) => c.status === "APPROVED" || c.status === "SCHEDULED" || c.status === "PUBLISHED").length;
  const approvalRate = content.length ? Math.round((approved / content.length) * 100) : 0;

  const kpis = [
    { label: "Total content", value: content.length },
    { label: "Approved+", value: approved },
    { label: "Approval rate", value: `${approvalRate}%` },
    { label: "In review", value: content.filter((c) => c.status === "IN_REVIEW").length },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionLabel>Analytics</SectionLabel>
        <h1 className="font-display mt-1 text-4xl">How the work is moving</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5">
            <p className="text-sm text-[var(--muted)]">{k.label}</p>
            <p className="font-display mt-2 text-4xl">{k.value}</p>
          </Card>
        ))}
      </div>

      <AnalyticsSummary />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-5 text-sm font-medium">Content by status</h2>
          {statusSegments.length ? <Donut segments={statusSegments} /> : <p className="text-sm text-[var(--muted)]">No data.</p>}
        </Card>
        <Card className="p-6">
          <h2 className="mb-5 text-sm font-medium">Created over time</h2>
          <BarChart data={months} />
        </Card>
        <Card className="p-6 lg:col-span-2">
          <h2 className="mb-5 text-sm font-medium">Content by platform</h2>
          {platformData.length ? <BarChart data={platformData} /> : <p className="text-sm text-[var(--muted)]">No data.</p>}
        </Card>
      </div>
    </div>
  );
}
