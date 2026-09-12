import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhook } from "@/lib/dodo";

// Dodo Payments webhook receiver. Verifies the Standard Webhooks signature and
// updates the workspace's plan/status across the subscription lifecycle.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const secret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET ?? "";

  const ok = verifyWebhook(
    rawBody,
    {
      id: req.headers.get("webhook-id"),
      timestamp: req.headers.get("webhook-timestamp"),
      signature: req.headers.get("webhook-signature"),
    },
    secret,
  );
  if (!ok) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  let event: { type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const data = (event.data ?? {}) as Record<string, unknown>;
  const metadata = (data.metadata ?? {}) as Record<string, string>;
  const workspaceId = metadata.workspaceId;
  const plan = metadata.plan;
  const subscriptionId = (data.subscription_id ?? data.id) as string | undefined;
  const customerId =
    (data.customer_id as string | undefined) ??
    ((data.customer as Record<string, unknown> | undefined)?.customer_id as string | undefined);
  const nextBilling = (data.next_billing_date ?? data.current_period_end) as string | undefined;

  if (!workspaceId) {
    // Nothing to map to; acknowledge so Dodo does not retry forever.
    return NextResponse.json({ ok: true, note: "no workspace metadata" });
  }

  async function update(fields: Record<string, unknown>) {
    await db.workspace.update({ where: { id: workspaceId }, data: fields });
  }

  switch (event.type) {
    case "subscription.active":
    case "subscription.renewed":
      await update({
        plan: plan ?? undefined,
        planStatus: "active",
        dodoSubscriptionId: subscriptionId,
        dodoCustomerId: customerId,
        currentPeriodEnd: nextBilling ? new Date(nextBilling) : undefined,
      });
      break;
    case "subscription.on_hold":
      await update({ planStatus: "on_hold" });
      break;
    case "subscription.failed":
      await update({ planStatus: "canceled" });
      break;
    case "subscription.updated":
      if (nextBilling) await update({ currentPeriodEnd: new Date(nextBilling) });
      break;
    default:
      // ignore unrelated events (payment.*, etc.)
      break;
  }

  return NextResponse.json({ ok: true });
}
