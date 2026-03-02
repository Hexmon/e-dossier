import { api } from '@/app/lib/apiClient';
import type {
  AppointmentTemplateProfile,
  CampTemplateProfile,
  OrgTemplateApplyResult,
  OrgTemplateModule,
  PlatoonTemplateProfile,
  PtTemplateProfile,
} from '@/app/lib/bootstrap/types';
import { endpoints } from '@/constants/endpoints';

export type ApplyOrgTemplateRequest = {
  module: OrgTemplateModule;
  profile?: PtTemplateProfile | CampTemplateProfile | PlatoonTemplateProfile | AppointmentTemplateProfile;
  dryRun?: boolean;
};

export type ApplyOrgTemplateResponse = OrgTemplateApplyResult & {
  message: string;
};

export async function applyOrgTemplate(
  payload: ApplyOrgTemplateRequest
): Promise<ApplyOrgTemplateResponse> {
  return api.post<ApplyOrgTemplateResponse, ApplyOrgTemplateRequest>(
    endpoints.admin.bootstrapTemplateApply,
    payload
  );
}
