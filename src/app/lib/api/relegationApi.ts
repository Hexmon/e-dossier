import { api } from "@/app/lib/apiClient";
import { baseURL, endpoints } from "@/constants/endpoints";

export type RelegationOcOption = {
  ocId: string;
  ocNo: string;
  ocName: string;
  status: string;
  isActive: boolean;
  platoonId: string | null;
  platoonKey: string | null;
  platoonName: string | null;
  currentCourseId: string;
  currentCourseCode: string;
};

export type RelegationCourseOption = {
  courseId: string;
  courseCode: string;
  courseName: string;
};

export type RelegationMovementKind = "TRANSFER" | "PROMOTION_BATCH" | "PROMOTION_EXCEPTION";

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
      movementKind: RelegationMovementKind;
      performedAt: string;
    };
  };
};

export type RelegationHistoryItem = {
  id: string;
  movementKind: RelegationMovementKind;
  ocId: string;
  ocNo: string;
  ocName: string;
  platoonId: string | null;
  platoonKey: string | null;
  platoonName: string | null;
  fromCourseId: string;
  fromCourseCode: string;
  fromCourseName: string | null;
  toCourseId: string;
  toCourseCode: string;
  toCourseName: string | null;
  reason: string;
  remark: string | null;
  hasMedia: boolean;
  performedByUserId: string;
  performedAt: string;
};

export type RelegationHistoryResponse = {
  items: RelegationHistoryItem[];
  total: number;
  limit: number;
  offset: number;
  count: number;
};

export type RelegationPromoteCourseRequest = {
  fromCourseId: string;
  toCourseId: string;
  excludeOcIds: string[];
  note?: string | null;
};

export type RelegationPromoteCourseResponse = {
  result: {
    fromCourse: RelegationCourseOption;
    toCourse: RelegationCourseOption;
    summary: {
      totalEligible: number;
      excludedByRequest: number;
      excludedByException: number;
      promoted: number;
    };
    promotedOcIds: string[];
  };
};

export type RelegationMediaSignedUrlResponse = {
  historyId: string;
  signedUrl: string;
  expiresInSeconds: number | null;
};

export type RelegationOcOptionsParams = {
  courseId?: string;
  q?: string;
  activeOnly?: boolean;
};

export type RelegationHistoryParams = {
  q?: string;
  courseFromId?: string;
  courseToId?: string;
  movementKind?: RelegationMovementKind;
  limit?: number;
  offset?: number;
};

export const relegationApi = {
  getOcOptions: (params?: RelegationOcOptionsParams) =>
    api.get<{ items: RelegationOcOption[] }>(endpoints.admin.relegation.ocOptions, {
      baseURL,
      query: {
        courseId: params?.courseId,
        q: params?.q,
        activeOnly: params?.activeOnly,
      },
    }),

  getImmediateNextCourses: (currentCourseId: string) =>
    api.get<{ items: RelegationCourseOption[] }>(endpoints.admin.relegation.nextCourses, {
      baseURL,
      query: { currentCourseId },
    }),

  getHistory: (params?: RelegationHistoryParams) =>
    api.get<RelegationHistoryResponse>(endpoints.admin.relegation.history, {
      baseURL,
      query: {
        q: params?.q,
        courseFromId: params?.courseFromId,
        courseToId: params?.courseToId,
        movementKind: params?.movementKind,
        limit: params?.limit,
        offset: params?.offset,
      },
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

  applyException: (payload: RelegationTransferRequest) =>
    api.post<RelegationTransferResponse, RelegationTransferRequest>(
      endpoints.admin.relegation.exception,
      payload,
      { baseURL }
    ),

  promoteCourse: (payload: RelegationPromoteCourseRequest) =>
    api.post<RelegationPromoteCourseResponse, RelegationPromoteCourseRequest>(
      endpoints.admin.relegation.promoteCourse,
      payload,
      { baseURL }
    ),

  getMediaSignedUrl: (historyId: string) =>
    api.get<RelegationMediaSignedUrlResponse>(endpoints.admin.relegation.mediaSignedUrl(historyId), {
      baseURL,
    }),
};
