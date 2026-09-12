import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getAccessibleClientIds } from "@/lib/data";
import { Whiteboard } from "@/components/whiteboard";

export default async function WhiteboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id }, select: { clientId: true } });
  if (!project) notFound();
  const ids = await getAccessibleClientIds();
  if (!ids.includes(project.clientId)) notFound();

  const elements = await db.whiteboardElement.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-display text-2xl">Whiteboard</h2>
      <Whiteboard projectId={id} initial={elements} />
    </div>
  );
}
