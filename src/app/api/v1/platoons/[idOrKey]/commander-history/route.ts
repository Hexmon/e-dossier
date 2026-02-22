import { getPlatoonCommanderHistoryByIdOrKey } from "@/app/db/queries/platoon-commanders";
import { ApiError, handleApiError, json } from "@/app/lib/http";
import { withAuditRoute, type AuditNextRequest } from "@/lib/audit";

export const runtime = "nodejs";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
};

async function GETHandler(
  _req: AuditNextRequest,
  { params }: { params: Promise<{ idOrKey: string }> },
) {
  try {
    const { idOrKey: rawIdOrKey } = await params;
    const idOrKey = decodeURIComponent(rawIdOrKey || "").trim();
    if (!idOrKey) {
      throw new ApiError(400, "idOrKey path param is required.", "bad_request");
    }

    const result = await getPlatoonCommanderHistoryByIdOrKey(idOrKey);

    return json.ok(
      {
        message: "Public platoon commander history retrieved successfully.",
        platoon: result.platoon,
        items: result.items.map((item) => ({
          appointmentId: item.appointmentId,
          name: item.name,
          rank: item.rank,
          assignment: item.assignment,
          startsAt: item.startsAt,
          endsAt: item.endsAt,
          status: item.status,
        })),
      },
      { headers: CACHE_HEADERS },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);
