import { notFound } from "next/navigation";
import { getContentByToken } from "@/lib/data";
import { ReviewWorkspace } from "@/components/review-workspace";
import { toVersionDTO, toCommentDTO } from "@/lib/serialize";
import { StatusBadge } from "@/components/ui";

// Public, tokenized preview. No app shell, no internal navigation — a client sees
// only this content, per the progressive-disclosure principle.
export default async function PreviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const content = await getContentByToken(token);
  if (!content) notFound();

  return (
    <div className="min-h-dvh bg-[var(--bg)]">
      <header className="sticky top-0 z-30 border-b bg-[var(--bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-5">
          <span className="font-display text-2xl tracking-tight">EngageFlow</span>
          <span className="text-sm text-[var(--muted)]">{content.project.client.name}</span>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-4xl">{content.title}</h1>
            <StatusBadge status={content.status} />
          </div>
          <p className="mt-2 max-w-2xl text-[var(--muted)]">
            Review the latest version below. Approve it, or pin a comment and request changes.
            Your feedback goes straight to the team.
          </p>
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
          mode="client"
          commenterName={content.project.client.contactName ?? "Client"}
        />
      </main>
    </div>
  );
}
