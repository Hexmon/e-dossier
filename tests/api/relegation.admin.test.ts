import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/app/lib/http";
import { createRouteContext, makeJsonRequest } from "../utils/next";

import { GET as getOcOptions } from "@/app/api/v1/admin/relegation/ocs/route";
import { GET as getNextCourses } from "@/app/api/v1/admin/relegation/courses/route";
import { POST as postPresign } from "@/app/api/v1/admin/relegation/presign/route";
import { POST as postPendingPdfCleanup } from "@/app/api/v1/admin/relegation/pending-pdf/cleanup/route";
import { POST as postPromoteCourse } from "@/app/api/v1/admin/relegation/promote-course/route";
import { POST as postTransfer } from "@/app/api/v1/admin/relegation/transfer/route";

import * as relegationQueries from "@/app/db/queries/relegation";
import * as relegationAuth from "@/app/lib/relegation-auth";
import * as storage from "@/app/lib/storage";

vi.mock("@/app/db/queries/relegation", () => ({
  listRelegationOcOptions: vi.fn(async () => []),
  listImmediateNextCourses: vi.fn(async () => []),
  listRelegationTargetCourses: vi.fn(async () => []),
  applyOcRelegationTransfer: vi.fn(async () => ({
    oc: {
      ocId: "11111111-1111-4111-8111-111111111111",
      ocNo: "OC-001",
      ocName: "Cadet One",
    },
    fromCourse: {
      courseId: "22222222-2222-4222-8222-222222222222",
      courseCode: "TES-50",
      courseName: "TES 50",
    },
    toCourse: {
      courseId: "33333333-3333-4333-8333-333333333333",
      courseCode: "TES-51",
      courseName: "TES 51",
    },
    history: {
      id: "44444444-4444-4444-8444-444444444444",
      movementKind: "TRANSFER",
      fromSemester: 4,
      toSemester: 1,
      performedAt: new Date().toISOString(),
    },
    cleanupSummary: null,
  })),
  isRelegationPdfObjectCommitted: vi.fn(async () => false),
  promoteCourseBatch: vi.fn(async () => ({
    fromCourse: {
      courseId: "22222222-2222-4222-8222-222222222222",
      courseCode: "TES-50",
      courseName: "TES 50",
    },
    toCourse: {
      courseId: "22222222-2222-4222-8222-222222222222",
      courseCode: "TES-50",
      courseName: "TES 50",
    },
    fromSemester: 1,
    toSemester: 2,
    summary: {
      totalEligible: 3,
      excludedByRequest: 1,
      excludedByException: 0,
      promoted: 2,
    },
    promotedOcIds: [
      "11111111-1111-4111-8111-111111111111",
      "55555555-5555-4555-8555-555555555555",
    ],
  })),
  parseCourseSequence: vi.fn(),
  isImmediateNextCourseCode: vi.fn(),
}));

vi.mock("@/app/lib/relegation-auth", () => ({
  getRelegationAccessContext: vi.fn(),
  assertCanWriteSingle: vi.fn(),
  assertCanPromoteBatch: vi.fn(),
}));

vi.mock("@/app/lib/storage", () => ({
  createPresignedUploadUrl: vi.fn(async () => "https://upload-url"),
  getPublicObjectUrl: vi.fn(() => "https://public-url"),
  deleteObject: vi.fn(async () => undefined),
}));

const ocOptionsPath = "/api/v1/admin/relegation/ocs";
const nextCoursesPath = "/api/v1/admin/relegation/courses";
const presignPath = "/api/v1/admin/relegation/presign";
const pendingPdfCleanupPath = "/api/v1/admin/relegation/pending-pdf/cleanup";
const promoteCoursePath = "/api/v1/admin/relegation/promote-course";
const transferPath = "/api/v1/admin/relegation/transfer";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(relegationAuth.getRelegationAccessContext).mockResolvedValue({
    userId: "admin-1",
    roles: ["ADMIN"],
    isAdmin: true,
    isPlatoonCommander: false,
    canWriteSingle: true,
    canPromoteBatch: true,
    scopeType: null,
    scopeId: null,
    scopePlatoonId: null,
  });
});

describe("Admin relegation APIs", () => {
  it("returns 401 when admin auth fails", async () => {
    vi.mocked(relegationAuth.getRelegationAccessContext).mockRejectedValueOnce(
      new ApiError(401, "Unauthorized", "unauthorized")
    );

    const req = makeJsonRequest({ method: "GET", path: ocOptionsPath });
    const res = await getOcOptions(req as any, createRouteContext());

    expect(res.status).toBe(401);
  });

  it("returns 403 when admin auth is forbidden", async () => {
    vi.mocked(relegationAuth.getRelegationAccessContext).mockRejectedValueOnce(
      new ApiError(403, "Forbidden", "forbidden")
    );

    const req = makeJsonRequest({ method: "GET", path: ocOptionsPath });
    const res = await getOcOptions(req as any, createRouteContext());

    expect(res.status).toBe(403);
  });

  it("GET /ocs returns OC options", async () => {
    vi.mocked(relegationQueries.listRelegationOcOptions).mockResolvedValueOnce([
      {
        ocId: "11111111-1111-4111-8111-111111111111",
        ocNo: "OC-001",
        ocName: "Cadet One",
        status: "ACTIVE",
        isActive: true,
        currentSemester: 1,
        platoonId: null,
        platoonKey: null,
        platoonName: null,
        currentCourseId: "22222222-2222-4222-8222-222222222222",
        currentCourseCode: "TES-50",
      },
    ]);

    const req = makeJsonRequest({ method: "GET", path: ocOptionsPath });
    const res = await getOcOptions(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].ocNo).toBe("OC-001");
  });

  it("GET /courses validates currentCourseId", async () => {
    const req = makeJsonRequest({ method: "GET", path: nextCoursesPath });
    const res = await getNextCourses(req as any, createRouteContext());

    expect(res.status).toBe(400);
  });

  it("GET /courses returns previous-semester target options", async () => {
    vi.mocked(relegationQueries.listRelegationTargetCourses).mockResolvedValueOnce([
      {
        courseId: "33333333-3333-4333-8333-333333333333",
        courseCode: "TES-51",
        courseName: "TES 51",
      },
    ]);

    const req = makeJsonRequest({
      method: "GET",
      path: `${nextCoursesPath}?currentCourseId=22222222-2222-4222-8222-222222222222&mode=PREVIOUS_SEMESTER`,
    });
    const res = await getNextCourses(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items[0].courseCode).toBe("TES-51");
    expect(relegationQueries.listRelegationTargetCourses).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222",
      "PREVIOUS_SEMESTER"
    );
  });

  it("GET /courses returns repeat-semester target options", async () => {
    vi.mocked(relegationQueries.listRelegationTargetCourses).mockResolvedValueOnce([
      {
        courseId: "33333333-3333-4333-8333-333333333333",
        courseCode: "TES-51",
        courseName: "TES 51",
      },
    ]);

    const req = makeJsonRequest({
      method: "GET",
      path: `${nextCoursesPath}?currentCourseId=22222222-2222-4222-8222-222222222222&mode=REPEAT_SEMESTER`,
    });
    const res = await getNextCourses(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items[0].courseCode).toBe("TES-51");
    expect(relegationQueries.listRelegationTargetCourses).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222",
      "REPEAT_SEMESTER"
    );
  });

  it("GET /courses returns a friendly error when the relegation target course is missing", async () => {
    vi.mocked(relegationQueries.listRelegationTargetCourses).mockRejectedValueOnce(
      new ApiError(
        404,
        "Relegation target course TES-51 is not configured. Create TES-51 in Course Management before previous-semester relegation.",
        "relegation_target_course_not_found",
        {
          currentCourseCode: "TES-50",
          expectedCourseCode: "TES-51",
        }
      )
    );

    const req = makeJsonRequest({
      method: "GET",
      path: `${nextCoursesPath}?currentCourseId=22222222-2222-4222-8222-222222222222&mode=PREVIOUS_SEMESTER`,
    });
    const res = await getNextCourses(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("relegation_target_course_not_found");
    expect(body.message).toContain("Relegation target course TES-51 is not configured");
    expect(body.expectedCourseCode).toBe("TES-51");
  });

  it("GET /courses returns all course-transfer targets except current through query mode", async () => {
    vi.mocked(relegationQueries.listRelegationTargetCourses).mockResolvedValueOnce([
      {
        courseId: "33333333-3333-4333-8333-333333333333",
        courseCode: "TES-49",
        courseName: "TES 49",
      },
      {
        courseId: "44444444-4444-4444-8444-444444444444",
        courseCode: "TES-51",
        courseName: "TES 51",
      },
    ]);

    const req = makeJsonRequest({
      method: "GET",
      path: `${nextCoursesPath}?currentCourseId=22222222-2222-4222-8222-222222222222&mode=COURSE_TRANSFER`,
    });
    const res = await getNextCourses(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items.map((item: { courseCode: string }) => item.courseCode)).toEqual([
      "TES-49",
      "TES-51",
    ]);
    expect(relegationQueries.listRelegationTargetCourses).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222",
      "COURSE_TRANSFER"
    );
  });

  it("POST /presign rejects invalid payload", async () => {
    const req = makeJsonRequest({
      method: "POST",
      path: presignPath,
      body: {
        fileName: "proof.pdf",
        contentType: "image/png",
        sizeBytes: 1024,
      },
    });

    const res = await postPresign(req as any, createRouteContext());
    expect(res.status).toBe(400);
  });

  it("POST /presign returns upload URL", async () => {
    const req = makeJsonRequest({
      method: "POST",
      path: presignPath,
      body: {
        fileName: "proof.pdf",
        contentType: "application/pdf",
        sizeBytes: 1024,
      },
    });

    const res = await postPresign(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.uploadUrl).toBe("https://upload-url");
    expect(storage.createPresignedUploadUrl).toHaveBeenCalledTimes(1);
  });

  it("POST /presign returns storage 503 when upload signing fails", async () => {
    vi.mocked(storage.createPresignedUploadUrl).mockRejectedValueOnce(
      Object.assign(new Error("File storage is unavailable. Check MinIO/storage configuration."), {
        name: "StorageUnavailableError",
        service: "storage",
        retryable: true,
      })
    );

    const req = makeJsonRequest({
      method: "POST",
      path: presignPath,
      body: {
        fileName: "proof.pdf",
        contentType: "application/pdf",
        sizeBytes: 1024,
      },
    });

    const res = await postPresign(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body).toMatchObject({
      ok: false,
      status: 503,
      error: "service_unavailable",
      service: "storage",
      retryable: true,
      message: "File storage is unavailable. Check MinIO/storage configuration.",
    });
  });

  it("POST /pending-pdf/cleanup deletes an uncommitted relegation PDF", async () => {
    vi.mocked(relegationQueries.isRelegationPdfObjectCommitted).mockResolvedValueOnce(false);

    const req = makeJsonRequest({
      method: "POST",
      path: pendingPdfCleanupPath,
      body: {
        objectKey: "relegation/pending.pdf",
      },
    });

    const res = await postPendingPdfCleanup(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.deleted).toBe(true);
    expect(storage.deleteObject).toHaveBeenCalledWith("relegation/pending.pdf");
  });

  it("POST /pending-pdf/cleanup refuses committed relegation PDFs", async () => {
    vi.mocked(relegationQueries.isRelegationPdfObjectCommitted).mockResolvedValueOnce(true);

    const req = makeJsonRequest({
      method: "POST",
      path: pendingPdfCleanupPath,
      body: {
        objectKey: "relegation/committed.pdf",
      },
    });

    const res = await postPendingPdfCleanup(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe("relegation_pdf_committed");
    expect(storage.deleteObject).not.toHaveBeenCalled();
  });

  it("POST /transfer validates payload", async () => {
    const req = makeJsonRequest({
      method: "POST",
      path: transferPath,
      body: {
        ocId: "11111111-1111-4111-8111-111111111111",
        toCourseId: "33333333-3333-4333-8333-333333333333",
        reason: "",
      },
    });

    const res = await postTransfer(req as any, createRouteContext());
    expect(res.status).toBe(400);
  });

  it("POST /promote-course validates payload", async () => {
    const req = makeJsonRequest({
      method: "POST",
      path: promoteCoursePath,
      body: {
        fromCourseId: "22222222-2222-4222-8222-222222222222",
        excludeOcIds: [],
      },
    });

    const res = await postPromoteCourse(req as any, createRouteContext());
    expect(res.status).toBe(400);
  });

  it("POST /promote-course promotes semester-wise within a course", async () => {
    const req = makeJsonRequest({
      method: "POST",
      path: promoteCoursePath,
      body: {
        fromCourseId: "22222222-2222-4222-8222-222222222222",
        fromSemester: 1,
        excludeOcIds: ["66666666-6666-4666-8666-666666666666"],
        note: "Semester progression",
      },
    });

    const res = await postPromoteCourse(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.result.fromSemester).toBe(1);
    expect(body.result.toSemester).toBe(2);
    expect(relegationQueries.promoteCourseBatch).toHaveBeenCalledWith(
      {
        fromCourseId: "22222222-2222-4222-8222-222222222222",
        fromSemester: 1,
        excludeOcIds: ["66666666-6666-4666-8666-666666666666"],
        note: "Semester progression",
      },
      "admin-1"
    );
  });

  it("POST /transfer returns 400 when backend rejects the target course", async () => {
    vi.mocked(relegationQueries.applyOcRelegationTransfer).mockRejectedValueOnce(
      new ApiError(400, "Invalid transfer target", "bad_request")
    );

    const req = makeJsonRequest({
      method: "POST",
      path: transferPath,
      body: {
        ocId: "11111111-1111-4111-8111-111111111111",
        toCourseId: "33333333-3333-4333-8333-333333333333",
        relegationMode: "COURSE_TRANSFER",
        targetSemester: null,
        reason: "Failed modules",
      },
    });

    const res = await postTransfer(req as any, createRouteContext());
    expect(res.status).toBe(400);
  });

  it("POST /transfer cleans up pending PDF when backend rejects after upload", async () => {
    vi.mocked(relegationQueries.applyOcRelegationTransfer).mockRejectedValueOnce(
      new ApiError(400, "Invalid transfer target", "bad_request")
    );
    vi.mocked(relegationQueries.isRelegationPdfObjectCommitted).mockResolvedValueOnce(false);

    const req = makeJsonRequest({
      method: "POST",
      path: transferPath,
      body: {
        ocId: "11111111-1111-4111-8111-111111111111",
        toCourseId: "33333333-3333-4333-8333-333333333333",
        relegationMode: "COURSE_TRANSFER",
        targetSemester: null,
        reason: "Failed modules",
        pdfObjectKey: "relegation/pending.pdf",
        pdfUrl: "https://public-url/relegation/pending.pdf",
      },
    });

    const res = await postTransfer(req as any, createRouteContext());

    expect(res.status).toBe(400);
    expect(storage.deleteObject).toHaveBeenCalledWith("relegation/pending.pdf");
  });

  it("POST /transfer applies relegation and returns summary", async () => {
    const req = makeJsonRequest({
      method: "POST",
      path: transferPath,
      body: {
        ocId: "11111111-1111-4111-8111-111111111111",
        toCourseId: "33333333-3333-4333-8333-333333333333",
        relegationMode: "COURSE_TRANSFER",
        targetSemester: null,
        reason: "Failed modules",
        remark: "Retake required",
        pdfObjectKey: "relegation/abc.pdf",
        pdfUrl: "https://public-url/relegation/abc.pdf",
      },
    });

    const res = await postTransfer(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.transfer.toCourse.courseCode).toBe("TES-51");
    expect(relegationQueries.applyOcRelegationTransfer).toHaveBeenCalledWith(
      {
        ocId: "11111111-1111-4111-8111-111111111111",
        toCourseId: "33333333-3333-4333-8333-333333333333",
        relegationMode: "COURSE_TRANSFER",
        targetSemester: null,
        reason: "Failed modules",
        remark: "Retake required",
        pdfObjectKey: "relegation/abc.pdf",
        pdfUrl: "https://public-url/relegation/abc.pdf",
      },
      "admin-1",
      { scopePlatoonId: null }
    );
  });

  it("POST /transfer accepts previous-semester relegation payload", async () => {
    const req = makeJsonRequest({
      method: "POST",
      path: transferPath,
      body: {
        ocId: "11111111-1111-4111-8111-111111111111",
        toCourseId: "33333333-3333-4333-8333-333333333333",
        relegationMode: "PREVIOUS_SEMESTER",
        targetSemester: 3,
        reason: "Late result correction",
      },
    });

    const res = await postTransfer(req as any, createRouteContext());

    expect(res.status).toBe(201);
    expect(relegationQueries.applyOcRelegationTransfer).toHaveBeenCalledWith(
      {
        ocId: "11111111-1111-4111-8111-111111111111",
        toCourseId: "33333333-3333-4333-8333-333333333333",
        relegationMode: "PREVIOUS_SEMESTER",
        targetSemester: 3,
        reason: "Late result correction",
      },
      "admin-1",
      { scopePlatoonId: null }
    );
  });

  it("POST /transfer accepts repeat-semester relegation payload", async () => {
    const req = makeJsonRequest({
      method: "POST",
      path: transferPath,
      body: {
        ocId: "11111111-1111-4111-8111-111111111111",
        toCourseId: "33333333-3333-4333-8333-333333333333",
        relegationMode: "REPEAT_SEMESTER",
        targetSemester: 2,
        reason: "Repeat semester in next course",
      },
    });

    const res = await postTransfer(req as any, createRouteContext());

    expect(res.status).toBe(201);
    expect(relegationQueries.applyOcRelegationTransfer).toHaveBeenCalledWith(
      {
        ocId: "11111111-1111-4111-8111-111111111111",
        toCourseId: "33333333-3333-4333-8333-333333333333",
        relegationMode: "REPEAT_SEMESTER",
        targetSemester: 2,
        reason: "Repeat semester in next course",
      },
      "admin-1",
      { scopePlatoonId: null }
    );
  });

  it("POST /transfer rejects previous-semester relegation without target semester", async () => {
    const req = makeJsonRequest({
      method: "POST",
      path: transferPath,
      body: {
        ocId: "11111111-1111-4111-8111-111111111111",
        toCourseId: "33333333-3333-4333-8333-333333333333",
        relegationMode: "PREVIOUS_SEMESTER",
        reason: "Late result correction",
      },
    });

    const res = await postTransfer(req as any, createRouteContext());

    expect(res.status).toBe(400);
    expect(relegationQueries.applyOcRelegationTransfer).not.toHaveBeenCalled();
  });
});
