import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DELETE as deleteCommRoute,
  GET as getCommRoute,
  PATCH as patchCommRoute,
} from "@/app/api/v1/oc/[ocId]/parent-comms/[id]/route";
import { ApiError } from "@/app/lib/http";
import { createRouteContext, makeJsonRequest } from "../utils/next";

const auditLogMock = vi.fn(async () => undefined);

vi.mock("@/lib/audit", () => ({
  withAuditRoute: (_method: string, handler: any) => {
    return (req: any, context: any) => {
      req.audit = { log: auditLogMock };
      return handler(req, context);
    };
  },
  AuditEventType: {
    API_REQUEST: "api.request",
    OC_RECORD_UPDATED: "oc.record.updated",
    OC_RECORD_DELETED: "oc.record.deleted",
  },
  AuditResourceType: {
    OC: "oc",
  },
}));

vi.mock("@/app/api/v1/oc/_checks", () => ({
  mustBeAuthed: vi.fn(),
  parseParam: vi.fn(),
  ensureOcExists: vi.fn(),
  assertOcSemesterWriteAllowed: vi.fn(),
}));

vi.mock("@/app/db/queries/oc", () => ({
  getComm: vi.fn(),
  updateComm: vi.fn(),
  deleteComm: vi.fn(),
}));

import * as ocChecks from "@/app/api/v1/oc/_checks";
import * as ocQueries from "@/app/db/queries/oc";

const ocId = "11111111-1111-4111-8111-111111111111";
const recordId = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ocChecks.mustBeAuthed).mockResolvedValue({ userId: "user-1", roles: ["USER"] } as any);
  vi.mocked(ocChecks.parseParam).mockImplementation(async ({ params }: any, schema: any) =>
    schema.parse(await params)
  );
  vi.mocked(ocChecks.ensureOcExists).mockResolvedValue(undefined);
  vi.mocked(ocChecks.assertOcSemesterWriteAllowed).mockResolvedValue(undefined as any);
});

describe("parent communication route", () => {
  it("retrieves an active communication record", async () => {
    vi.mocked(ocQueries.getComm).mockResolvedValue({
      id: recordId,
      ocId,
      semester: 5,
    } as any);

    const res = await getCommRoute(
      makeJsonRequest({
        method: "GET",
        path: `/api/v1/oc/${ocId}/parent-comms/${recordId}`,
      }) as any,
      createRouteContext({ ocId, id: recordId })
    );

    expect(res.status).toBe(200);
  });

  it("soft deletes an active parent communication record", async () => {
    vi.mocked(ocQueries.getComm).mockResolvedValue({
      id: recordId,
      ocId,
      semester: 5,
    } as any);
    vi.mocked(ocQueries.deleteComm).mockResolvedValue({ id: recordId } as any);

    const res = await deleteCommRoute(
      makeJsonRequest({
        method: "DELETE",
        path: `/api/v1/oc/${ocId}/parent-comms/${recordId}`,
      }) as any,
      createRouteContext({ ocId, id: recordId })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe(recordId);
  });

  it("returns not_found after a parent communication is already soft deleted", async () => {
    vi.mocked(ocQueries.getComm).mockResolvedValue(null as any);

    const res = await deleteCommRoute(
      makeJsonRequest({
        method: "DELETE",
        path: `/api/v1/oc/${ocId}/parent-comms/${recordId}`,
      }) as any,
      createRouteContext({ ocId, id: recordId })
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("not_found");
    expect(ocQueries.deleteComm).not.toHaveBeenCalled();
  });

  it("keeps derived semester locking on update", async () => {
    vi.mocked(ocQueries.getComm).mockResolvedValue({
      id: recordId,
      ocId,
      semester: 1,
    } as any);
    vi.mocked(ocChecks.assertOcSemesterWriteAllowed).mockRejectedValueOnce(
      new ApiError(403, "Only the current semester can be modified.", "semester_locked", {
        currentSemester: 5,
        requestedSemester: 1,
      }) as any
    );

    const res = await patchCommRoute(
      makeJsonRequest({
        method: "PATCH",
        path: `/api/v1/oc/${ocId}/parent-comms/${recordId}`,
        body: { brief: "Updated" },
      }) as any,
      createRouteContext({ ocId, id: recordId })
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("semester_locked");
  });
});
