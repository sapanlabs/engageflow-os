import Link from "next/link";
import { db } from "@/lib/db";
import { getAccessibleClientIds } from "@/lib/data";
import { Card, SectionLabel, EmptyState } from "@/components/ui";
import { NewNoteButton } from "@/components/note-actions";
import { timeAgo } from "@/lib/utils";

export default async function NotesPage() {
  const clientIds = await getAccessibleClientIds();
  const notes = await db.note.findMany({
    where: { clientId: { in: clientIds }, parentId: null },
    orderBy: { updatedAt: "desc" },
    include: { client: true, project: true, children: true },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between">
        <div>
          <SectionLabel>Notes</SectionLabel>
          <h1 className="font-display mt-1 text-4xl">Briefs, scripts &amp; docs</h1>
        </div>
        <NewNoteButton clientId={clientIds[0]} />
      </div>

      {notes.length === 0 ? (
        <EmptyState title="No notes yet" hint="Capture briefs, scripts, and strategy alongside the work." action={<NewNoteButton clientId={clientIds[0]} />} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((n) => (
            <Link key={n.id} href={`/notes/${n.id}`}>
              <Card className="transition-quiet p-5 hover:border-[var(--fg)]/20">
                <p className="font-medium">{n.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{n.body.replace(/[#*`]/g, "").slice(0, 120) || "Empty note"}</p>
                <p className="mt-3 text-xs text-[var(--muted)]">
                  {n.client?.name}{n.project ? ` · ${n.project.name}` : ""} · {timeAgo(n.updatedAt)}
                  {n.children.length > 0 ? ` · ${n.children.length} sub-pages` : ""}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
