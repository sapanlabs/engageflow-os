import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getAccessibleClientIds } from "@/lib/data";
import { StatusBadge } from "@/components/ui";
import { ProjectTabs } from "@/components/project-tabs";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await db.project.findUnique({
    where: { id },
    include: { client: true },
  });
  if (!project) notFound();
  const ids = await getAccessibleClientIds();
  if (!ids.includes(project.clientId)) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/clients/${project.clientId}`}
          className="text-sm text-[var(--muted)] hover:text-[var(--fg)]"
        >
          ← {project.client.name}
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="font-display text-4xl">{project.name}</h1>
          <StatusBadge status={project.status} kind="project" />
        </div>
        {project.description && (
          <p className="mt-2 max-w-2xl text-[var(--muted)]">{project.description}</p>
        )}
      </div>
      <ProjectTabs projectId={project.id} />
      <div>{children}</div>
    </div>
  );
}
