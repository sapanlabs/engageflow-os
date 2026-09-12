import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getAccessibleClientIds } from "@/lib/data";
import { Card, EmptyState } from "@/components/ui";
import { NewNoteButton } from "@/components/note-actions";
import { timeAgo } from "@/lib/utils";

export default async function ProjectNotesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id }, select: { clientId: true } });
  if (!project) notFound();
  const ids = await getAccessibleClientIds();
  if (!ids.includes(project.clientId)) notFound();

  const notes = await db.note.findMany({
    where: { projectId: id, parentId: null },
    orderBy: { updatedAt: "desc" },
    include: { children: true },
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Notes</h2>
        <NewNoteButton clientId={project.clientId} projectId={id} />
      </div>
      {notes.length === 0 ? (
        <EmptyState title="No notes yet" hint="Add a brief, script, or research doc for this project." action={<NewNoteButton clientId={project.clientId} projectId={id} />} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((n) => (
            <Link key={n.id} href={`/notes/${n.id}`}>
              <Card className="transition-quiet p-5 hover:border-[var(--fg)]/20">
                <p className="font-medium">{n.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{n.body.replace(/[#*`]/g, "").slice(0, 120) || "Empty note"}</p>
                <p className="mt-3 text-xs text-[var(--muted)]">{timeAgo(n.updatedAt)}{n.children.length ? ` · ${n.children.length} sub-pages` : ""}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
