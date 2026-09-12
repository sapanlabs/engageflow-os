import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, getUsers } from "@/lib/data";
import { Card, StatusBadge, EmptyState } from "@/components/ui";
import { NewContentButton } from "@/components/forms";
import { PLATFORM_LABELS } from "@/lib/constants";

export default async function ProjectContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();
  const users = await getUsers();
  const editor = users.find((u) => u.role === "EDITOR") ?? users[0];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Content</h2>
        <NewContentButton projectId={project.id} editorId={editor.id} />
      </div>
      {project.contents.length === 0 ? (
        <EmptyState
          title="No content yet"
          hint="Add the first piece of content to this project."
          action={<NewContentButton projectId={project.id} editorId={editor.id} />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {project.contents.map((c) => (
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
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug">{c.title}</p>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">{PLATFORM_LABELS[c.platform]}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
