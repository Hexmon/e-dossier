import { withAuditRoute } from "@/lib/audit";
import { GETHandler, PUTHandler } from "./handlers";

export const runtime = "nodejs";

export const GET = withAuditRoute("GET", GETHandler);
export const PUT = withAuditRoute("PUT", PUTHandler);
