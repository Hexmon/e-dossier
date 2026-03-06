import { listPublicEventsNews } from "@/app/db/queries/site-settings";
import { handleApiError, json } from "@/app/lib/http";
import { eventNewsTypeSchema, sortSchema } from "@/app/lib/validators.site-settings";
import { withAuditRoute, type AuditNextRequest } from "@/lib/audit";

export const runtime = "nodejs";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
};

async function GETHandler(req: AuditNextRequest) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const sort = sortSchema.parse((searchParams.get("sort") ?? "desc").toLowerCase());
    const rawType = searchParams.get("type");
    const type = rawType ? eventNewsTypeSchema.parse(rawType.toLowerCase()) : undefined;

    const items = await listPublicEventsNews(sort, type);

    return json.ok(
      {
        message: "Public events and news retrieved successfully.",
        items: items.map((row) => ({
          id: row.id,
          date: row.date,
          title: row.title,
          description: row.description,
          location: row.location,
          type: row.type,
        })),
        count: items.length,
        sort,
        type: type ?? null,
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);
