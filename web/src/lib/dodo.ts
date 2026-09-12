import { createHmac, timingSafeEqual } from "node:crypto";

// Dodo Payments client. Test vs live is chosen by DODO_PAYMENTS_ENVIRONMENT.
// Docs: https://docs.dodopayments.com
const ENV = process.env.DODO_PAYMENTS_ENVIRONMENT ?? "test";
const BASE_URL = ENV === "live" ? "https://live.dodopayments.com" : "https://test.dodopayments.com";
const API_KEY = process.env.DODO_PAYMENTS_API_KEY ?? "";

export function isDodoConfigured(): boolean {
  return API_KEY.length > 0;
}

type CheckoutParams = {
  productId: string;
  quantity?: number;
  customer: { email: string; name?: string };
  returnUrl: string;
  metadata?: Record<string, string>;
};

// Creates a hosted subscription checkout session and returns the checkout URL.
export async function createCheckoutSession(p: CheckoutParams): Promise<{ url: string; sessionId?: string }> {
  if (!isDodoConfigured()) throw new Error("Dodo Payments is not configured (missing DODO_PAYMENTS_API_KEY).");
  const res = await fetch(`${BASE_URL}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_cart: [{ product_id: p.productId, quantity: p.quantity ?? 1 }],
      customer: { email: p.customer.email, name: p.customer.name },
      return_url: p.returnUrl,
      metadata: p.metadata ?? {},
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Dodo checkout failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  return { url: json.checkout_url ?? json.url, sessionId: json.session_id ?? json.id };
}

// Standard Webhooks signature verification (Dodo follows standardwebhooks.com).
// Headers: webhook-id, webhook-timestamp, webhook-signature ("v1,<base64>").
// Signed content is `${id}.${timestamp}.${rawBody}` with the base64 secret after "whsec_".
export function verifyWebhook(
  rawBody: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  secret: string,
): boolean {
  if (!headers.id || !headers.timestamp || !headers.signature || !secret) return false;
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${headers.id}.${headers.timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secretBytes).update(signedContent).digest("base64");

  // Header can contain multiple space-delimited "v1,<sig>" pairs.
  const provided = headers.signature.split(" ").map((p) => (p.includes(",") ? p.split(",")[1] : p));
  return provided.some((sig) => {
    try {
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  });
}
