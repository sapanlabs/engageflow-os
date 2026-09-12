import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session-token";

// ============================================================================
// Routing / auth — SINGLE source of truth.
//
// The proxy (Edge middleware) is the ONLY place that makes auth-based routing
// decisions. Pages and layouts never redirect on auth, so the two runtimes can
// never disagree and cause a redirect loop.
//
// Route map:
//   PUBLIC (no session needed):
//     /                 marketing landing (guests) — signed-in team -> /dashboard
//     /login            sign-in (guests) — signed-in team -> /dashboard
//     /pricing          public pricing
//     /preview/*        tokenized client review links (public by token)
//     /api/health, /api/auth/*, /api/webhooks/*   public endpoints
//   PROTECTED (team session required): everything else, incl. /dashboard, /clients,
//     /content, /projects, /calendar, /notes, /analytics, /settings, other /api/*.
//
// A CLIENT-role session is NOT a team session; clients use /preview links only.
//
// Invalid/stale cookies are DELETED on the way through so a bad cookie can never
// cause a perpetual bounce.
// ============================================================================

const SECRET = process.env.SESSION_SECRET ?? "dev-secret";
const COOKIE = "ef_session";

const PUBLIC_EXACT = new Set(["/", "/login", "/pricing"]);
const PUBLIC_PREFIX = ["/preview", "/api/health", "/api/auth", "/api/webhooks"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIX.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(COOKIE)?.value;
  const session = token ? await verifySession(token, SECRET) : null;
  const badCookie = !!token && !session; // present but unverifiable -> stale
  const authed = !!session && session.role !== "CLIENT";

  // Attach a cookie-clear to any response when the incoming cookie is invalid.
  const withCleanup = (res: NextResponse) => {
    if (badCookie) res.cookies.delete(COOKIE);
    return res;
  };

  const toDashboard = () => NextResponse.redirect(new URL("/dashboard", req.url));
  const toLogin = () => {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (pathname !== "/dashboard") url.searchParams.set("next", pathname);
    return withCleanup(NextResponse.redirect(url));
  };

  // Static files (uploads, images, fonts, etc.) are always allowed.
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) {
    return withCleanup(NextResponse.next());
  }

  // Marketing landing at "/" is public for everyone (logged in or not).
  if (pathname === "/") {
    return withCleanup(NextResponse.next());
  }

  // Login form: guests see it; signed-in team are sent to the app.
  if (pathname === "/login") {
    return authed ? toDashboard() : withCleanup(NextResponse.next());
  }

  // Other public routes.
  if (isPublic(pathname)) {
    return withCleanup(NextResponse.next());
  }

  // Protected routes require a team session.
  if (!authed) {
    if (pathname.startsWith("/api/")) {
      return withCleanup(NextResponse.json({ error: "unauthorized" }, { status: 401 }));
    }
    return toLogin();
  }

  return NextResponse.next();
}

// Skip static assets and image optimizer; run on everything else.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
