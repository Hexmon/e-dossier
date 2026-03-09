import { api } from "@/app/lib/apiClient";
import { baseURL } from "@/constants/endpoints";

export type InterviewPendingTickerSettingModel = {
  id: string;
  startDate: string;
  endDate: string;
  days: number;
  createdBy: string | null;
  createdByUsername: string | null;
  createdAt: string;
};

type InterviewPendingTickerSettingsResponse = {
  message: string;
  setting: InterviewPendingTickerSettingModel | null;
  logs: InterviewPendingTickerSettingModel[];
  count: number;
};

type InterviewPendingTickerSettingsCreateResponse = {
  message: string;
  setting: InterviewPendingTickerSettingModel;
};

type InterviewPendingTickerSettingsCreatePayload = {
  startDate: string;
  endDate: string;
};

export const interviewPendingTickerSettingsApi = {
  get: (params?: { includeLogs?: boolean; limit?: number; offset?: number }) =>
    api.get<InterviewPendingTickerSettingsResponse>("/api/v1/admin/interview/pending/ticker-setting", {
      baseURL,
      query: params,
    }),

  create: (payload: InterviewPendingTickerSettingsCreatePayload) =>
    api.post<InterviewPendingTickerSettingsCreateResponse, InterviewPendingTickerSettingsCreatePayload>(
      "/api/v1/admin/interview/pending/ticker-setting",
      payload,
      { baseURL }
    ),
};
