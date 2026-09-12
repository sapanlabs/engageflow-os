import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";
import { AiError } from "@/lib/ai/provider";
import { LimitError } from "@/lib/billing";

// Consistent JSON helper.
export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

// Wraps a route handler: catches errors and returns a consistent, safe envelope
// ({ error, code }) with the right status. Never leaks stack traces.
export function handle<Args extends unknown[]>(
  fn: (...args: Args) => Promise<NextResponse> | NextResponse,
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await fn(...args);
    } catch (e) {
      return toResponse(e);
    }
  };
}

export function toResponse(e: unknown): NextResponse {
  if (e instanceof ZodError) {
    const first = e.issues[0];
    const field = first?.path?.join(".") ?? "input";
    return NextResponse.json(
      { error: `${field}: ${first?.message ?? "invalid"}`, code: "VALIDATION", issues: e.issues },
      { status: 422 },
    );
  }
  if (e instanceof AppError) {
    return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
  }
  if (e instanceof LimitError) {
    return NextResponse.json({ error: e.message, code: "PLAN_LIMIT" }, { status: 402 });
  }
  if (e instanceof AiError) {
    const status = e.code === "DISABLED" || e.code === "FEATURE_OFF" ? 403 : e.code === "NO_KEY" ? 400 : 502;
    return NextResponse.json({ error: e.message, code: e.code }, { status });
  }
  // Unknown: log server-side, return generic message (no stack leak).
  console.error("[api] unhandled error:", e);
  return NextResponse.json({ error: "Something went wrong", code: "INTERNAL" }, { status: 500 });
}
