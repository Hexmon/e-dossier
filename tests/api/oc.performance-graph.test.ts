import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRouteContext, makeJsonRequest } from "../utils/next";

const auditLogMock = vi.fn(async () => undefined);

vi.mock("@/lib/audit", () => ({
  withAuditRoute: (_method: string, handler: any) => {
    return (req: any, context: any) => {
      req.audit = { log: auditLogMock };
      return handler(req, context);
    };
  },
}));

vi.mock("@/app/api/v1/oc/_checks", () => ({
  parseParam: vi.fn(),
  ensureOcExists: vi.fn(),
}));

vi.mock("@/lib/authorization", () => ({
  authorizeOcAccess: vi.fn(),
}));

vi.mock("@/app/db/queries/performance-graph", () => ({
  getPerformanceGraphData: vi.fn(),
}));

import { GET as getPerformanceGraphRoute } from "@/app/api/v1/oc/[ocId]/performance-graph/route";
import * as ocChecks from "@/app/api/v1/oc/_checks";
import * as authz from "@/lib/authorization";
import * as performanceGraphQueries from "@/app/db/queries/performance-graph";

const ocId = "11111111-1111-4111-8111-111111111111";
const graphData = {
  academics: { cadet: [0, 0, 0, 0, 0, 0], courseAverage: [0, 0, 0, 0, 0, 0], cadetTermPresence: [false, false, false, false, false, false] },
  olq: { cadet: [0, 0, 0, 0, 0, 0], courseAverage: [0, 0, 0, 0, 0, 0], cadetTermPresence: [false, false, false, false, false, false] },
  odt: { cadet: [0, 0, 0, 0, 0, 0], courseAverage: [0, 0, 0, 0, 0, 0], cadetTermPresence: [false, false, false, false, false, false] },
  discipline: { cadet: [0, 0, 0, 0, 0, 0], courseAverage: [0, 0, 0, 0, 0, 0], cadetTermPresence: [false, false, false, false, false, false] },
  medical: { cadet: [4, 0, 0, 0, 0, 0], courseAverage: [3, 0, 0, 0, 0, 0], cadetTermPresence: [true, false, false, false, false, false] },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ocChecks.parseParam).mockImplementation(async ({ params }: any, schema: any) =>
    schema.parse(await params)
  );
  vi.mocked(ocChecks.ensureOcExists).mockResolvedValue(undefined);
  vi.mocked(authz.authorizeOcAccess).mockResolvedValue({ userId: "user-1" } as any);
  vi.mocked(performanceGraphQueries.getPerformanceGraphData).mockResolvedValue(graphData as any);
});

describe("GET /api/v1/oc/:ocId/performance-graph", () => {
  it("returns performance graph data after OC authorization", async () => {
    const res = await getPerformanceGraphRoute(
      makeJsonRequest({ method: "GET", path: `/api/v1/oc/${ocId}/performance-graph` }) as any,
      createRouteContext({ ocId })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.medical.cadet[0]).toBe(4);
    expect(authz.authorizeOcAccess).toHaveBeenCalledWith(expect.anything(), ocId);
    expect(performanceGraphQueries.getPerformanceGraphData).toHaveBeenCalledWith(ocId);
  });
});
