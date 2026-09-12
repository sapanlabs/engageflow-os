import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleClientIds } from "@/lib/data";
import { db } from "@/lib/db";
import { ensureProjectChannel } from "@/lib/chat";
import { ChannelPane } from "@/components/chat/channel-pane";

export default async function ProjectChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  // RBAC: the project must belong to a client the user can access.
  const project = await db.project.findUnique({ where: { id }, select: { clientId: true } });
  if (!project) notFound();
  const ids = await getAccessibleClientIds();
  if (!ids.includes(project.clientId)) notFound();

  // Backfill the channel for projects created before this feature (idempotent).
  const channel = await ensureProjectChannel(id, user?.id);
  if (!channel) notFound();

  return <ChannelPane channelId={channel.id} meId={user?.id ?? ""} />;
}
