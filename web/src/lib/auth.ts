import { cookies } from "next/headers";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { signSession, verifySession } from "@/lib/session-token";

const COOKIE = "ef_session";
const SECRET = process.env.SESSION_SECRET ?? "dev-secret";

// --- password hashing (node scrypt, no external dep) ---
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const attempt = scryptSync(password, salt, 64);
  const original = Buffer.from(hash, "hex");
  return attempt.length === original.length && timingSafeEqual(attempt, original);
}

// --- session lifecycle ---
export async function createSession(userId: string, role: string) {
  const token = await signSession({ userId, role }, SECRET);
  const jar = await cookies();
  // A `Secure` cookie is only sent over HTTPS. Base this on the actual app URL
  // protocol, NOT the build mode — otherwise `npm run start` on http://localhost
  // sets Secure and the browser silently drops the session on every request.
  const secure = (process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https://");
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSessionPayload() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return verifySession(token, SECRET);
}

export async function getCurrentUser() {
  const payload = await getSessionPayload();
  if (!payload) return null;
  return db.user.findUnique({ where: { id: payload.userId } });
}

export async function login(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  await createSession(user.id, user.role);
  return user;
}
