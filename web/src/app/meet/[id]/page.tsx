import { getCurrentUser } from "@/lib/auth";
import { MeetingRoom } from "@/components/meet/meeting-room";

export default async function MeetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  return (
    <div className="h-dvh w-dvw overflow-hidden">
      <MeetingRoom id={id} meName={user?.name ?? "Guest"} />
    </div>
  );
}
