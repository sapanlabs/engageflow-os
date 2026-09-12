import { db } from "@/lib/db";
import { getAccessibleClientIds } from "@/lib/data";
import { CalendarView, type CalEvent } from "@/components/calendar-view";
import { CAL_EVENT_TYPES } from "@/lib/constants";
import { SectionLabel } from "@/components/ui";

export default async function CalendarPage() {
  const clientIds = await getAccessibleClientIds();
  const scope = { clientId: { in: clientIds } };

  const [contents, projects, tasks, meetings] = await Promise.all([
    db.content.findMany({
      where: { project: scope, scheduledAt: { not: null } },
      include: { project: { include: { client: true } } },
    }),
    db.project.findMany({ where: scope, include: { client: true } }),
    db.task.findMany({
      where: { project: scope, dueDate: { not: null } },
      include: { project: { include: { client: true } }, assignee: true },
    }),
    db.meeting.findMany({
      where: { OR: [{ clientId: { in: clientIds } }, { clientId: null }] },
    }),
  ]);

  const events: CalEvent[] = [];

  for (const c of contents) {
    events.push({
      id: `content-${c.id}`,
      title: c.title,
      subtitle: c.project.client.name,
      date: c.scheduledAt!.toISOString(),
      type: CAL_EVENT_TYPES.CONTENT,
      status: c.status,
      href: `/content/${c.id}`,
    });
  }
  for (const p of projects) {
    if (p.startDate) events.push({ id: `proj-start-${p.id}`, title: `${p.name} starts`, subtitle: p.client.name, date: p.startDate.toISOString(), allDay: true, type: CAL_EVENT_TYPES.DEADLINE, href: `/projects/${p.id}` });
    if (p.endDate) events.push({ id: `proj-end-${p.id}`, title: `${p.name} due`, subtitle: p.client.name, date: p.endDate.toISOString(), allDay: true, type: CAL_EVENT_TYPES.DEADLINE, href: `/projects/${p.id}` });
  }
  for (const t of tasks) {
    events.push({
      id: `task-${t.id}`,
      title: t.title,
      subtitle: t.assignee ? `${t.project.name} · ${t.assignee.name}` : t.project.name,
      date: t.dueDate!.toISOString(),
      allDay: true,
      type: CAL_EVENT_TYPES.TASK,
      href: `/projects/${t.projectId}/tasks`,
    });
  }
  for (const m of meetings) {
    const when = m.startedAt ?? m.createdAt;
    events.push({ id: `meet-${m.id}`, title: m.title, subtitle: m.createdByName || "Call", date: when.toISOString(), type: CAL_EVENT_TYPES.MEETING, href: `/meet/${m.id}` });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SectionLabel>Calendar</SectionLabel>
        <h1 className="font-display mt-1 text-4xl">Everything on the schedule</h1>
        <p className="mt-2 text-[var(--muted)]">Publishing dates, deadlines, tasks, and calls across every client and project.</p>
      </div>
      <CalendarView events={events} defaultView="month" />
    </div>
  );
}
