import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspace } from "@/lib/data";
import { getPlan } from "@/lib/plans";
import { createCheckoutSession, isDodoConfigured } from "@/lib/dodo";

// Starts a Dodo subscription checkout for the given plan/interval and redirects
// the browser to the hosted checkout. Only admins can start billing.
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));
  if (user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/settings/billing?error=admin-only", req.url));
  }

  const planId = req.nextUrl.searchParams.get("plan") ?? "";
  const interval = (req.nextUrl.searchParams.get("interval") ?? "monthly") as "monthly" | "annual";
  const plan = getPlan(planId);

  if (!plan.selfServe) {
    return NextResponse.redirect(new URL("/settings/billing?error=contact-sales", req.url));
  }
  if (!isDodoConfigured()) {
    return NextResponse.redirect(new URL("/settings/billing?error=not-configured", req.url));
  }

  const envName = plan.dodoProductEnv[interval];
  const productId = envName ? process.env[envName] : undefined;
  if (!productId) {
    return NextResponse.redirect(new URL("/settings/billing?error=missing-product", req.url));
  }

  const ws = await getWorkspace();
  try {
    const { url } = await createCheckoutSession({
      productId,
      customer: { email: user.email, name: user.name },
      returnUrl: new URL("/settings/billing?status=success", req.url).toString(),
      metadata: { workspaceId: ws.id, plan: plan.id, interval },
    });
    return NextResponse.redirect(url);
  } catch (e) {
    return NextResponse.redirect(
      new URL(`/settings/billing?error=${encodeURIComponent((e as Error).message)}`, req.url),
    );
  }
}
