import { createHmac } from "node:crypto";

// ============================================================================
// LiveKit access tokens, minted with node crypto (no server SDK dependency).
//
// A LiveKit token is just a JWT (HS256) signed with the API secret, carrying a
// `video` grant. Building it here keeps the module dependency-light and matches
// the repo's "own the primitive" approach (cf. session-token.ts, crypto.ts).
//
// Calling is a CONFIGURABLE feature: set LIVEKIT_URL / LIVEKIT_API_KEY /
// LIVEKIT_API_SECRET to enable it. Without them, meetings still exist (records,
// transcripts, minutes) but the live A/V room shows a "connect a server" state,
// exactly like the AI and billing features degrade gracefully.
// ============================================================================

export function livekitConfig() {
  const url = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || "";
  const apiKey = process.env.LIVEKIT_API_KEY || "";
  const apiSecret = process.env.LIVEKIT_API_SECRET || "";
  return { url, apiKey, apiSecret, configured: !!(url && apiKey && apiSecret) };
}

export function livekitConfigured(): boolean {
  return livekitConfig().configured;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export type LivekitGrant = {
  roomJoin?: boolean;
  room?: string;
  canPublish?: boolean;
  canSubscribe?: boolean;
  canPublishData?: boolean;
  hidden?: boolean; // for a silent bot (e.g. the note-taker)
};

// Create a signed LiveKit access token for `identity` to join `room`.
export function createAccessToken(opts: {
  identity: string;
  name?: string;
  room: string;
  grant?: LivekitGrant;
  ttlSeconds?: number;
  metadata?: string;
}): string {
  const { apiKey, apiSecret } = livekitConfig();
  if (!apiKey || !apiSecret) throw new Error("LiveKit is not configured");

  const now = Math.floor(Date.now() / 1000);
  const ttl = opts.ttlSeconds ?? 60 * 60 * 6; // 6h
  const video: LivekitGrant = {
    roomJoin: true,
    room: opts.room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    ...opts.grant,
  };

  const header = { alg: "HS256", typ: "JWT" };
  const payload: Record<string, unknown> = {
    iss: apiKey,
    sub: opts.identity,
    name: opts.name ?? opts.identity,
    nbf: now,
    exp: now + ttl,
    jti: opts.identity,
    video,
    ...(opts.metadata ? { metadata: opts.metadata } : {}),
  };

  const encHeader = b64url(JSON.stringify(header));
  const encPayload = b64url(JSON.stringify(payload));
  const signingInput = `${encHeader}.${encPayload}`;
  const signature = b64url(createHmac("sha256", apiSecret).update(signingInput).digest());
  return `${signingInput}.${signature}`;
}
