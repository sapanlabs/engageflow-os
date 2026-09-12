import { getCurrentUser } from "@/lib/auth";
import { ensureDefaultChannels } from "@/lib/chat";
import { ChatWorkspace } from "@/components/chat/chat-workspace";

export default async function ChatPage() {
  const user = await getCurrentUser();
  await ensureDefaultChannels();
  return <ChatWorkspace meId={user?.id ?? ""} />;
}
