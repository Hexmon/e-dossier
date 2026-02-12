import { api } from "@/app/lib/apiClient";
import { baseURL, endpoints } from "@/constants/endpoints";

export type RelegationOcOption = {
  ocId: string;
  ocNo: string;
  ocName: string;
  isActive: boolean;
  currentCourseId: string;
  currentCourseCode: string;
};

export type RelegationCourseOption = {
  courseId: string;
  courseCode: string;
  courseName: string;
};

export type RelegationPdfPresignRequest = {
  fileName: string;
  contentType: "application/pdf";
  sizeBytes: number;
};

export type RelegationPdfPresignResponse = {
  uploadUrl: string;
  publicUrl: string;
  objectKey: string;
  expiresInSeconds: number;
};

export type RelegationTransferRequest = {
  ocId: string;
  toCourseId: string;
  reason: string;
  remark?: string | null;
  pdfObjectKey?: string | null;
  pdfUrl?: string | null;
};

export type RelegationTransferResponse = {
  transfer: {
    oc: {
      ocId: string;
      ocNo: string;
      ocName: string;
    };
    fromCourse: {
      courseId: string;
      courseCode: string;
      courseName: string;
    };
    toCourse: RelegationCourseOption;
    history: {
      id: string;
      performedAt: string;
    };
  };
};

export const relegationApi = {
  getOcOptions: () =>
    api.get<{ items: RelegationOcOption[] }>(endpoints.admin.relegation.ocOptions, {
      baseURL,
    }),

  getImmediateNextCourses: (currentCourseId: string) =>
    api.get<{ items: RelegationCourseOption[] }>(endpoints.admin.relegation.nextCourses, {
      baseURL,
      query: { currentCourseId },
    }),

  presignPdf: (payload: RelegationPdfPresignRequest) =>
    api.post<RelegationPdfPresignResponse, RelegationPdfPresignRequest>(
      endpoints.admin.relegation.presign,
      payload,
      { baseURL }
    ),

  applyTransfer: (payload: RelegationTransferRequest) =>
    api.post<RelegationTransferResponse, RelegationTransferRequest>(
      endpoints.admin.relegation.transfer,
      payload,
      { baseURL }
    ),
};
