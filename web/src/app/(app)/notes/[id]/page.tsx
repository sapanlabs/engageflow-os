import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getAccessibleClientIds } from "@/lib/data";
import { NoteEditor } from "@/components/note-editor";
import { NewNoteButton } from "@/components/note-actions";

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const note = await db.note.findUnique({
    where: { id },
    include: { client: true, project: true, children: { orderBy: { createdAt: "asc" } }, parent: true },
  });
  if (!note) notFound();
  if (note.clientId) {
    const ids = await getAccessibleClientIds();
    if (!ids.includes(note.clientId)) notFound();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="text-sm text-[var(--muted)]">
        <Link href="/notes" className="hover:text-[var(--fg)]">Notes</Link>
        {note.parent && <> · <Link href={`/notes/${note.parent.id}`} className="hover:text-[var(--fg)]">{note.parent.title}</Link></>}
        {note.client && <> · {note.client.name}</>}
      </div>

      <NoteEditor id={note.id} initialTitle={note.title} initialBody={note.body} />

      <div className="border-t pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium">Sub-pages</h3>
          <NewNoteButton clientId={note.clientId ?? undefined} projectId={note.projectId ?? undefined} parentId={note.id} label="+ Add sub-page" />
        </div>
        {note.children.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No sub-pages yet.</p>
        ) : (
          <div className="flex flex-col divide-y rounded-[var(--radius-card)] border">
            {note.children.map((c) => (
              <Link key={c.id} href={`/notes/${c.id}`} className="px-4 py-3 text-sm hover:bg-[var(--surface-2)]">
                {c.title}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
