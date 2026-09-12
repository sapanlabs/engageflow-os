import { getCurrentUser } from "@/lib/auth";
import { ChatWorkspace } from "@/components/chat/chat-workspace";

export default async function ChatChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  return <ChatWorkspace activeId={id} meId={user?.id ?? ""} />;
}
