import { NextRequest } from "next/server";
import { login } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { Errors } from "@/lib/errors";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";

// REST login: JSON or form-encoded { email, password }. Rate limited + validated.
export const POST = handle(async (req: NextRequest) => {
  rateLimit(`login:${clientIp(req)}`, 10, 60_000); // 10 attempts/min/IP

  const ct = req.headers.get("content-type") ?? "";
  let raw: { email?: unknown; password?: unknown };
  if (ct.includes("application/json")) {
    raw = await req.json().catch(() => ({}));
  } else {
    const form = await req.formData();
    raw = { email: form.get("email"), password: form.get("password") };
  }

  const { email, password } = loginSchema.parse({ email: raw.email, password: raw.password });
  const user = await login(email, password);
  if (!user) throw Errors.unauthorized("Invalid credentials");
  return ok({ id: user.id, name: user.name, role: user.role, email: user.email });
});
