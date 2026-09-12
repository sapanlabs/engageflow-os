import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getAccessibleClientIds } from "@/lib/data";
import { CalendarView, type CalEvent } from "@/components/calendar-view";
import { CAL_EVENT_TYPES } from "@/lib/constants";
import { ScheduleControl } from "@/components/schedule-control";
import { StatusBadge } from "@/components/ui";

export default async function ProjectCalendarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id } });
  if (!project) notFound();
  const ids = await getAccessibleClientIds();
  if (!ids.includes(project.clientId)) notFound();

  const [contents, tasks, meetings] = await Promise.all([
    db.content.findMany({ where: { projectId: id }, orderBy: { createdAt: "asc" } }),
    db.task.findMany({ where: { projectId: id, dueDate: { not: null } }, include: { assignee: true } }),
    db.meeting.findMany({ where: { projectId: id } }),
  ]);

  const events: CalEvent[] = [];
  for (const c of contents) {
    if (c.scheduledAt) events.push({ id: `content-${c.id}`, title: c.title, date: c.scheduledAt.toISOString(), type: CAL_EVENT_TYPES.CONTENT, status: c.status, href: `/content/${c.id}` });
  }
  if (project.startDate) events.push({ id: `proj-start-${project.id}`, title: `${project.name} starts`, date: project.startDate.toISOString(), allDay: true, type: CAL_EVENT_TYPES.DEADLINE, href: `/projects/${project.id}` });
  if (project.endDate) events.push({ id: `proj-end-${project.id}`, title: `${project.name} due`, date: project.endDate.toISOString(), allDay: true, type: CAL_EVENT_TYPES.DEADLINE, href: `/projects/${project.id}` });
  for (const t of tasks) {
    events.push({ id: `task-${t.id}`, title: t.title, subtitle: t.assignee?.name, date: t.dueDate!.toISOString(), allDay: true, type: CAL_EVENT_TYPES.TASK, href: `/projects/${id}/tasks` });
  }
  for (const m of meetings) {
    const when = m.startedAt ?? m.createdAt;
    events.push({ id: `meet-${m.id}`, title: m.title, subtitle: m.createdByName || "Call", date: when.toISOString(), type: CAL_EVENT_TYPES.MEETING, href: `/meet/${m.id}` });
  }

  const unscheduled = contents.filter((c) => !c.scheduledAt);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-display text-2xl">Calendar</h2>
      <CalendarView events={events} defaultView="month" />

      <div>
        <h3 className="mb-3 text-sm font-medium">Schedule content</h3>
        <div className="flex flex-col divide-y rounded-[var(--radius-card)] border">
          {contents.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <Link href={`/content/${c.id}`} className="text-sm font-medium hover:underline">{c.title}</Link>
                <StatusBadge status={c.status} />
              </div>
              <ScheduleControl contentId={c.id} current={c.scheduledAt?.toISOString()} />
            </div>
          ))}
          {contents.length === 0 && <p className="p-4 text-sm text-[var(--muted)]">No content to schedule yet.</p>}
        </div>
        {unscheduled.length > 0 && (
          <p className="mt-2 text-xs text-[var(--muted)]">{unscheduled.length} item(s) not yet on the calendar.</p>
        )}
      </div>
    </div>
  );
}
