import { json, handleApiError } from "@/app/lib/http";
import { parseParam, ensureOcExists } from "../../_checks";
import { OcIdParam } from "@/app/lib/oc-validators";
import { authorizeOcAccess } from "@/lib/authorization";
import { withRouteLogging } from "@/lib/withRouteLogging";
import { getPerformanceGraphData } from "@/app/db/queries/performance-graph";
import { NextRequest } from "next/server";

async function GETHandler(
  req: NextRequest,
  { params }: { params: Promise<{ ocId: string }> },
) {
  try {
    const { ocId } = await parseParam({ params }, OcIdParam);
    await ensureOcExists(ocId);
    await authorizeOcAccess(req, ocId);

    const data = await getPerformanceGraphData(ocId);
    return json.ok({
      message: "Performance graph data retrieved successfully.",
      data,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const GET = withRouteLogging("GET", GETHandler);
