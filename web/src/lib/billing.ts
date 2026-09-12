import { db } from "@/lib/db";
import { getWorkspace } from "@/lib/data";
import { getPlan, isUnlimited, type PlanFeatures } from "@/lib/plans";

export async function getWorkspacePlan() {
  const ws = await getWorkspace();
  return { ws, plan: getPlan(ws.plan) };
}

export async function getUsage() {
  const ws = await getWorkspace();
  const [clients, projects, seats, assetAgg] = await Promise.all([
    db.client.count({ where: { workspaceId: ws.id } }),
    db.project.count({ where: { client: { workspaceId: ws.id } } }),
    db.user.count({ where: { workspaceId: ws.id, role: { not: "CLIENT" } } }),
    db.asset.aggregate({ where: { workspaceId: ws.id }, _sum: { size: true } }),
  ]);
  const storageGb = Math.round(((assetAgg._sum.size ?? 0) / (1024 * 1024 * 1024)) * 100) / 100;
  return { clients, projects, seats, storageGb };
}

export class LimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LimitError";
  }
}

// Throws a LimitError if creating one more of `resource` would exceed the plan.
export async function assertWithinLimit(resource: "clients" | "projects" | "seats") {
  const { plan } = await getWorkspacePlan();
  const limit = plan.limits[resource];
  if (isUnlimited(limit)) return;
  const usage = await getUsage();
  if (usage[resource] >= limit) {
    throw new LimitError(
      `Your ${plan.name} plan allows up to ${limit} ${resource}. Upgrade to add more.`,
    );
  }
}

// Feature gate check for the current workspace plan.
export async function hasFeature(feature: keyof PlanFeatures): Promise<boolean> {
  const { plan } = await getWorkspacePlan();
  return plan.features[feature];
}
