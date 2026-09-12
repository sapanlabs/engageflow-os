import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getChannelsForUser } from "@/lib/chat";
import { subscribe, type RealtimeEvent } from "@/lib/realtime";

// SSE stream of chat events, scoped to the channels this user can access.
// nodejs runtime (uses the in-process EventEmitter bus) and never cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const visible = await getChannelsForUser();
  const allowed = new Set(visible.map((c) => c.id));

  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: RealtimeEvent) => {
        // Only forward events for channels this user can see.
        if ("channelId" in event && event.channelId && !allowed.has(event.channelId)) {
          if (event.type === "channel.new") allowed.add(event.channelId); // learn about new ones
          else return;
        }
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          /* stream closed */
        }
      };

      controller.enqueue(encoder.encode(`: connected\n\n`));
      unsubscribe = subscribe(send);
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          /* closed */
        }
      }, 25000);
    },
    cancel() {
      unsubscribe();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  req.signal.addEventListener("abort", () => {
    unsubscribe();
    if (heartbeat) clearInterval(heartbeat);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
