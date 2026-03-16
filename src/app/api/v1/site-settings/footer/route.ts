import { getPublicFooter } from "@/app/db/queries/site-settings";
import { handleApiError, json } from "@/app/lib/http";
import { withAuditRoute, type AuditNextRequest } from "@/lib/audit";

export const runtime = "nodejs";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
};

async function GETHandler(_req: AuditNextRequest) {
  try {
    const item = await getPublicFooter();

    return json.ok(
      {
        message: "Public footer retrieved successfully.",
        item,
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);
