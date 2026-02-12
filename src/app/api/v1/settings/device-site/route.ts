// Deprecated compatibility alias.
// Prefer: /api/v1/admin/device-site-settings
import { withAuditRoute } from "@/lib/audit";
import { GETHandler, PUTHandler } from "@/app/api/v1/admin/device-site-settings/handlers";

export const runtime = "nodejs";

export const GET = withAuditRoute("GET", GETHandler);
export const PUT = withAuditRoute("PUT", PUTHandler);
