import { EventEmitter } from "node:events";

// ============================================================================
// Realtime event bus — dependency-light transport for chat + presence.
//
// A single in-process EventEmitter fans events out to SSE subscribers (see
// /api/chat/stream). Kept on globalThis so Next.js hot-reload in dev reuses one
// bus instead of spawning many (same pattern as src/lib/db.ts).
//
// Scope note: this is a single-process bus, perfect for local dev and a single
// Node server (`npm run start`). For multi-instance production, swap the
// publish/subscribe internals for Redis pub/sub or a managed bus — the public
// API (publish/subscribe) stays the same, so nothing else changes.
// ============================================================================

export type RealtimeEvent =
  | { type: "message.new"; channelId: string; message: unknown }
  | { type: "message.update"; channelId: string; message: unknown }
  | { type: "message.delete"; channelId: string; messageId: string }
  | { type: "reaction.update"; channelId: string; messageId: string; reactions: unknown }
  | { type: "channel.new"; channelId: string; channel: unknown }
  | { type: "typing"; channelId: string; userId: string; userName: string }
  | { type: "meeting.update"; channelId: string | null; meeting: unknown };

const globalForBus = globalThis as unknown as { efBus?: EventEmitter };

const bus =
  globalForBus.efBus ??
  (() => {
    const e = new EventEmitter();
    e.setMaxListeners(0); // many concurrent SSE subscribers
    return e;
  })();

if (process.env.NODE_ENV !== "production") globalForBus.efBus = bus;

const CHANNEL = "rt";

export function publish(event: RealtimeEvent): void {
  bus.emit(CHANNEL, event);
}

export function subscribe(handler: (event: RealtimeEvent) => void): () => void {
  bus.on(CHANNEL, handler);
  return () => bus.off(CHANNEL, handler);
}
