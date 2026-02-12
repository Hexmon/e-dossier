import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/app/lib/http";
import { createRouteContext, makeJsonRequest } from "../utils/next";

import { GET as getOcOptions } from "@/app/api/v1/admin/relegation/ocs/route";
import { GET as getNextCourses } from "@/app/api/v1/admin/relegation/courses/route";
import { POST as postPresign } from "@/app/api/v1/admin/relegation/presign/route";
import { POST as postTransfer } from "@/app/api/v1/admin/relegation/transfer/route";

import * as authz from "@/app/lib/authz";
import * as relegationQueries from "@/app/db/queries/relegation";
import * as storage from "@/app/lib/storage";

vi.mock("@/app/lib/authz", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/app/db/queries/relegation", () => ({
  listRelegationOcOptions: vi.fn(async () => []),
  listImmediateNextCourses: vi.fn(async () => []),
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
      performedAt: new Date().toISOString(),
    },
  })),
  parseCourseSequence: vi.fn(),
  isImmediateNextCourseCode: vi.fn(),
}));

vi.mock("@/app/lib/storage", () => ({
  createPresignedUploadUrl: vi.fn(async () => "https://upload-url"),
  getPublicObjectUrl: vi.fn(() => "https://public-url"),
}));

const ocOptionsPath = "/api/v1/admin/relegation/ocs";
const nextCoursesPath = "/api/v1/admin/relegation/courses";
const presignPath = "/api/v1/admin/relegation/presign";
const transferPath = "/api/v1/admin/relegation/transfer";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authz.requireAdmin).mockResolvedValue({
    userId: "admin-1",
    roles: ["ADMIN"],
    claims: {},
  } as Awaited<ReturnType<typeof authz.requireAdmin>>);
});

describe("Admin relegation APIs", () => {
  it("returns 401 when admin auth fails", async () => {
    vi.mocked(authz.requireAdmin).mockRejectedValueOnce(
      new ApiError(401, "Unauthorized", "unauthorized")
    );

    const req = makeJsonRequest({ method: "GET", path: ocOptionsPath });
    const res = await getOcOptions(req as any, createRouteContext());

    expect(res.status).toBe(401);
  });

  it("returns 403 when admin auth is forbidden", async () => {
    vi.mocked(authz.requireAdmin).mockRejectedValueOnce(
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
        isActive: true,
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

  it("GET /courses returns immediate next options", async () => {
    vi.mocked(relegationQueries.listImmediateNextCourses).mockResolvedValueOnce([
      {
        courseId: "33333333-3333-4333-8333-333333333333",
        courseCode: "TES-51",
        courseName: "TES 51",
      },
    ]);

    const req = makeJsonRequest({
      method: "GET",
      path: `${nextCoursesPath}?currentCourseId=22222222-2222-4222-8222-222222222222`,
    });
    const res = await getNextCourses(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items[0].courseCode).toBe("TES-51");
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

  it("POST /transfer returns 400 when target is not immediate next", async () => {
    vi.mocked(relegationQueries.applyOcRelegationTransfer).mockRejectedValueOnce(
      new ApiError(400, "Invalid transfer target", "bad_request")
    );

    const req = makeJsonRequest({
      method: "POST",
      path: transferPath,
      body: {
        ocId: "11111111-1111-4111-8111-111111111111",
        toCourseId: "33333333-3333-4333-8333-333333333333",
        reason: "Failed modules",
      },
    });

    const res = await postTransfer(req as any, createRouteContext());
    expect(res.status).toBe(400);
  });

  it("POST /transfer applies relegation and returns summary", async () => {
    const req = makeJsonRequest({
      method: "POST",
      path: transferPath,
      body: {
        ocId: "11111111-1111-4111-8111-111111111111",
        toCourseId: "33333333-3333-4333-8333-333333333333",
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
        reason: "Failed modules",
        remark: "Retake required",
        pdfObjectKey: "relegation/abc.pdf",
        pdfUrl: "https://public-url/relegation/abc.pdf",
      },
      "admin-1"
    );
  });
});
