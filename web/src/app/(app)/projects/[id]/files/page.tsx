import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getAccessibleClientIds } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { Uploader } from "@/components/uploader";
import { AssetGrid } from "@/components/asset-grid";
import { ArchiveSweepButton } from "@/components/archive-sweep-button";
import { ARCHIVE_AFTER_DAYS } from "@/lib/archive";

export default async function FilesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id }, select: { clientId: true } });
  if (!project) notFound();
  const ids = await getAccessibleClientIds();
  if (!ids.includes(project.clientId)) notFound();
  const user = await getCurrentUser();

  const assets = await db.asset.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });
  const archivedCount = assets.filter((a) => a.status === "archived").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Files &amp; assets</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--muted)]">
            {assets.length} files{archivedCount > 0 ? ` · ${archivedCount} archived` : ""}
          </span>
          {user?.role === "ADMIN" && <ArchiveSweepButton />}
        </div>
      </div>

      <Uploader projectId={id} clientId={project.clientId} />

      <AssetGrid
        assets={assets.map((a) => ({
          id: a.id,
          name: a.name,
          url: a.url,
          mimeType: a.mimeType,
          kind: a.kind,
          size: a.size,
          status: a.status,
          posterUrl: a.posterUrl,
          createdAt: a.createdAt.toISOString(),
          archivedAt: a.archivedAt ? a.archivedAt.toISOString() : null,
        }))}
      />

      <p className="text-xs text-[var(--muted)]">
        Media untouched for {ARCHIVE_AFTER_DAYS} days is automatically compressed and archived to save storage.
        Archived files show a placeholder; click &ldquo;Request to view&rdquo; to restore them.
      </p>
    </div>
  );
}
