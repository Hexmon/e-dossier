import { listPublicHistory } from "@/app/db/queries/site-settings";
import { handleApiError, json } from "@/app/lib/http";
import { sortSchema } from "@/app/lib/validators.site-settings";
import { withAuditRoute, type AuditNextRequest } from "@/lib/audit";

export const runtime = "nodejs";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
};

async function GETHandler(req: AuditNextRequest) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const sort = sortSchema.parse((searchParams.get("sort") ?? "asc").toLowerCase());

    const items = await listPublicHistory(sort);

    return json.ok(
      {
        message: "Public history retrieved successfully.",
        items: items.map((row) => ({
          id: row.id,
          yearOrDate: row.yearOrDate,
          description: row.description,
        })),
        sort,
        count: items.length,
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);
