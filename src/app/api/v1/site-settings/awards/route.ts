import { listPublicAwards } from "@/app/db/queries/site-settings";
import { handleApiError, json } from "@/app/lib/http";
import { withAuditRoute, type AuditNextRequest } from "@/lib/audit";

export const runtime = "nodejs";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
};

async function GETHandler(_req: AuditNextRequest) {
  try {
    const items = await listPublicAwards();

    return json.ok(
      {
        message: "Public awards retrieved successfully.",
        items: items.map((row) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          category: row.category,
          imageUrl: row.imageUrl,
          sortOrder: row.sortOrder,
        })),
        count: items.length,
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);
