import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DELETE as deleteDisciplineRoute,
  GET as getDisciplineRoute,
  PATCH as patchDisciplineRoute,
} from "@/app/api/v1/oc/[ocId]/discipline/[id]/route";
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
  getDiscipline: vi.fn(),
  updateDiscipline: vi.fn(),
  deleteDiscipline: vi.fn(),
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

describe("discipline record route", () => {
  it("retrieves an active discipline record", async () => {
    vi.mocked(ocQueries.getDiscipline).mockResolvedValue({
      id: recordId,
      ocId,
      semester: 5,
    } as any);

    const res = await getDisciplineRoute(
      makeJsonRequest({
        method: "GET",
        path: `/api/v1/oc/${ocId}/discipline/${recordId}`,
      }) as any,
      createRouteContext({ ocId, id: recordId })
    );

    expect(res.status).toBe(200);
  });

  it("soft deletes a discipline record", async () => {
    vi.mocked(ocQueries.getDiscipline).mockResolvedValue({
      id: recordId,
      ocId,
      semester: 5,
    } as any);
    vi.mocked(ocQueries.deleteDiscipline).mockResolvedValue({ id: recordId } as any);

    const res = await deleteDisciplineRoute(
      makeJsonRequest({
        method: "DELETE",
        path: `/api/v1/oc/${ocId}/discipline/${recordId}`,
      }) as any,
      createRouteContext({ ocId, id: recordId })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe(recordId);
  });

  it("returns not_found when a soft-deleted discipline record is requested again", async () => {
    vi.mocked(ocQueries.getDiscipline).mockResolvedValue(null as any);

    const res = await deleteDisciplineRoute(
      makeJsonRequest({
        method: "DELETE",
        path: `/api/v1/oc/${ocId}/discipline/${recordId}`,
      }) as any,
      createRouteContext({ ocId, id: recordId })
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("not_found");
    expect(ocQueries.deleteDiscipline).not.toHaveBeenCalled();
  });

  it("keeps derived semester locking on update", async () => {
    vi.mocked(ocQueries.getDiscipline).mockResolvedValue({
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

    const res = await patchDisciplineRoute(
      makeJsonRequest({
        method: "PATCH",
        path: `/api/v1/oc/${ocId}/discipline/${recordId}`,
        body: { offence: "Updated" },
      }) as any,
      createRouteContext({ ocId, id: recordId })
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("semester_locked");
  });
});
