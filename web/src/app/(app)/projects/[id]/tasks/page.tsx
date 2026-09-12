import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getAccessibleClientIds } from "@/lib/data";
import { Kanban } from "@/components/kanban";

export default async function TasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await db.project.findUnique({
    where: { id },
    select: { clientId: true, client: { select: { members: { include: { user: true } } } } },
  });
  if (!project) notFound();
  const ids = await getAccessibleClientIds();
  if (!ids.includes(project.clientId)) notFound();

  const tasks = await db.task.findMany({
    where: { projectId: id },
    orderBy: [{ status: "asc" }, { position: "asc" }],
    include: { assignee: true },
  });

  // Assignable people = this client's team members.
  const assignees = project.client.members.map((m) => ({
    id: m.userId,
    name: m.user.name,
    avatarColor: m.user.avatarColor,
  }));

  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-display text-2xl">Tasks</h2>
      <Kanban
        projectId={id}
        assignees={assignees}
        initial={tasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          assigneeId: t.assigneeId,
          assignee: t.assignee ? { name: t.assignee.name, avatarColor: t.assignee.avatarColor } : null,
        }))}
      />
    </div>
  );
}
