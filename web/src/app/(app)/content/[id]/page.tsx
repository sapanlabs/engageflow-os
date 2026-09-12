import Link from "next/link";
import { notFound } from "next/navigation";
import { getContent, getUsers } from "@/lib/data";
import { ReviewWorkspace } from "@/components/review-workspace";
import { AddVersionButton } from "@/components/forms";
import { ShareLink } from "@/components/share-link";
import { StatusBadge } from "@/components/ui";
import { toVersionDTO, toCommentDTO } from "@/lib/serialize";

export default async function ContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const content = await getContent(id);
  if (!content) notFound();
  const users = await getUsers();
  const editor = users.find((u) => u.role === "EDITOR") ?? users[0];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href={`/projects/${content.projectId}`}
          className="text-sm text-[var(--muted)] hover:text-[var(--fg)]"
        >
          ← {content.project.name}
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-4xl">{content.title}</h1>
              <StatusBadge status={content.status} />
            </div>
            <p className="mt-1 text-[var(--muted)]">
              {content.project.client.name} · {content.project.name}
            </p>
          </div>
          <div className="flex gap-2">
            <ShareLink token={content.previewToken} />
            <AddVersionButton contentId={content.id} editorId={editor.id} />
          </div>
        </div>
      </div>

      <ReviewWorkspace
        contentId={content.id}
        title={content.title}
        platform={content.platform}
        style={content.style}
        status={content.status}
        caption={content.caption}
        versions={content.versions.map(toVersionDTO)}
        comments={content.comments.map(toCommentDTO)}
        mode="internal"
        commenterName="You"
      />
    </div>
  );
}
