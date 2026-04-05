import { api } from "@/app/lib/apiClient";
import { baseURL, endpoints } from "@/constants/endpoints";

export type DelegationRecord = {
  id: string;
  grantorUserId: string;
  grantorUsername: string;
  grantorAppointmentId: string | null;
  granteeUserId: string;
  granteeUsername: string;
  actAsPositionId: string | null;
  positionKey: string | null;
  positionName: string | null;
  scopeType: "GLOBAL" | "PLATOON";
  scopeId: string | null;
  platoonName: string | null;
  startsAt: string;
  endsAt: string | null;
  reason: string | null;
  createdBy: string | null;
  terminatedBy: string | null;
  terminatedAt: string | null;
  terminationReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateDelegationInput = {
  grantorAppointmentId: string;
  granteeUserId: string;
  startsAt: string;
  endsAt?: string | null;
  reason: string;
};

type DelegationsResponse = {
  message: string;
  items: DelegationRecord[];
};

type DelegationResponse = {
  message: string;
  item: DelegationRecord;
};

export const delegationAdminApi = {
  list: async (activeOnly = true) => {
    return api.get<DelegationsResponse>(endpoints.admin.delegations.list, {
      baseURL,
      query: { activeOnly },
    });
  },
  create: async (body: CreateDelegationInput) => {
    return api.post<DelegationResponse>(endpoints.admin.delegations.list, body, { baseURL });
  },
  terminate: async (id: string, reason: string) => {
    return api.patch<DelegationResponse>(endpoints.admin.delegations.terminate(id), { reason }, { baseURL });
  },
};
