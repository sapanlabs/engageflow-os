// Plan catalog — single source of truth for pricing, limits, and feature gates.
// Pricing is in USD (billed globally via Dodo Payments as Merchant of Record,
// which handles Indian GST + international sales tax). Amounts are what the
// customer pays; annual = ~2 months free.

export type PlanId = "FREELANCER" | "AGENCY" | "ENTERPRISE";

export type PlanLimits = {
  clients: number; // -1 = unlimited
  projects: number;
  seats: number;
  storageGb: number;
  analyticsMonths: number;
};

export type PlanFeatures = {
  contentPipeline: boolean;
  versioning: boolean;
  approvals: boolean;
  calendar: boolean;
  notes: boolean;
  whiteboard: boolean;
  tasks: boolean;
  credentialVault: boolean; // client platform credential manager
  customBrandedPreview: boolean; // white-label preview links
  advancedAnalytics: boolean;
  apiAccess: boolean;
  sso: boolean;
  auditLog: boolean;
  prioritySupport: boolean;
};

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  priceMonthly: number | null; // USD; null = custom (contact sales)
  priceAnnual: number | null; // USD/year
  selfServe: boolean; // can be purchased via checkout
  limits: PlanLimits;
  features: PlanFeatures;
  highlights: string[];
  // Dodo product ids come from env so they can differ per environment.
  dodoProductEnv: { monthly?: string; annual?: string };
};

export const PLANS: Record<PlanId, Plan> = {
  FREELANCER: {
    id: "FREELANCER",
    name: "Freelancer",
    tagline: "For solo creators and freelancers running a handful of clients.",
    priceMonthly: 29,
    priceAnnual: 290,
    selfServe: true,
    limits: { clients: 3, projects: 15, seats: 2, storageGb: 10, analyticsMonths: 3 },
    features: {
      contentPipeline: true, versioning: true, approvals: true, calendar: true,
      notes: true, whiteboard: true, tasks: true,
      credentialVault: false, customBrandedPreview: false, advancedAnalytics: false,
      apiAccess: false, sso: false, auditLog: false, prioritySupport: false,
    },
    highlights: [
      "Up to 3 clients", "2 team seats", "Content → review → approval loop",
      "Calendar, notes, whiteboard, tasks", "10 GB asset storage", "3 months analytics history",
    ],
    dodoProductEnv: { monthly: "DODO_PRODUCT_FREELANCER_MONTHLY", annual: "DODO_PRODUCT_FREELANCER_ANNUAL" },
  },
  AGENCY: {
    id: "AGENCY",
    name: "Agency",
    tagline: "For growing studios managing many clients and a full team.",
    priceMonthly: 79,
    priceAnnual: 790,
    selfServe: true,
    limits: { clients: 25, projects: -1, seats: 15, storageGb: 100, analyticsMonths: 12 },
    features: {
      contentPipeline: true, versioning: true, approvals: true, calendar: true,
      notes: true, whiteboard: true, tasks: true,
      credentialVault: true, customBrandedPreview: true, advancedAnalytics: true,
      apiAccess: true, sso: false, auditLog: false, prioritySupport: true,
    },
    highlights: [
      "Up to 25 clients", "15 team seats", "Everything in Freelancer",
      "Client credential vault", "White-label preview links", "Advanced analytics (12 months)",
      "API access", "Priority support",
    ],
    dodoProductEnv: { monthly: "DODO_PRODUCT_AGENCY_MONTHLY", annual: "DODO_PRODUCT_AGENCY_ANNUAL" },
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    name: "Enterprise",
    tagline: "For large teams needing scale, security, and control.",
    priceMonthly: null,
    priceAnnual: null,
    selfServe: false,
    limits: { clients: -1, projects: -1, seats: -1, storageGb: -1, analyticsMonths: -1 },
    features: {
      contentPipeline: true, versioning: true, approvals: true, calendar: true,
      notes: true, whiteboard: true, tasks: true,
      credentialVault: true, customBrandedPreview: true, advancedAnalytics: true,
      apiAccess: true, sso: true, auditLog: true, prioritySupport: true,
    },
    highlights: [
      "Unlimited clients & seats", "SSO / SAML", "Audit log & advanced permissions",
      "Custom storage", "Dedicated success manager", "SLA & security review",
    ],
    dodoProductEnv: {},
  },
};

export const PLAN_ORDER: PlanId[] = ["FREELANCER", "AGENCY", "ENTERPRISE"];

export function getPlan(id: string): Plan {
  return PLANS[(id as PlanId)] ?? PLANS.FREELANCER;
}

export function isUnlimited(n: number): boolean {
  return n < 0;
}

export function annualMonthlyEquivalent(plan: Plan): number | null {
  if (plan.priceAnnual == null) return null;
  return Math.round((plan.priceAnnual / 12) * 100) / 100;
}
