import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { archiveStaleAssets } from "@/lib/archive";
import { handle, ok } from "@/lib/api";
import { Errors } from "@/lib/errors";

// Maintenance sweep: archive media untouched for > 7 days. Run on a schedule
// (cron / Inngest / Trigger.dev in production). Admin-only for manual runs.
// Optional ?days=N override for testing.
export const POST = handle(async (req: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) throw Errors.unauthorized();
  if (user.role !== "ADMIN") throw Errors.forbidden("Admins only");

  const daysParam = req.nextUrl.searchParams.get("days");
  const days = daysParam ? Math.max(0, Number(daysParam)) : undefined;
  const archived = await archiveStaleAssets(days);
  return ok({ archived });
});
