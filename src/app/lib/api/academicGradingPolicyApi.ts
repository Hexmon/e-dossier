import { api } from '@/app/lib/apiClient';
import { endpoints } from '@/constants/endpoints';
import type {
  AcademicGradingPolicy,
  AcademicGradingPolicyRecalculateRequest,
  AcademicGradingPolicyRecalculateResult,
  AcademicGradingPolicyUpdateRequest,
} from '@/types/academic-grading-policy';

type GetPolicyResponse = {
  message: string;
  policy: AcademicGradingPolicy;
};

type UpdatePolicyResponse = {
  message: string;
  policy: AcademicGradingPolicy;
};

type RecalculateResponse = {
  message: string;
} & AcademicGradingPolicyRecalculateResult;

export async function getAcademicGradingPolicyApi(): Promise<GetPolicyResponse> {
  return api.get<GetPolicyResponse>(endpoints.admin.academics.gradingPolicy);
}

export async function updateAcademicGradingPolicyApi(
  payload: AcademicGradingPolicyUpdateRequest
): Promise<UpdatePolicyResponse> {
  return api.put<UpdatePolicyResponse, AcademicGradingPolicyUpdateRequest>(
    endpoints.admin.academics.gradingPolicy,
    payload
  );
}

export async function recalculateAcademicGradingPolicyApi(
  payload: AcademicGradingPolicyRecalculateRequest
): Promise<RecalculateResponse> {
  return api.post<RecalculateResponse, AcademicGradingPolicyRecalculateRequest>(
    endpoints.admin.academics.gradingPolicyRecalculate,
    payload
  );
}
