import { api } from "@/app/lib/apiClient";
import { baseURL, endpoints } from "@/constants/endpoints";

export type SwitchableIdentityResponseItem = {
  kind: "APPOINTMENT" | "DELEGATION";
  id: string;
  label: string;
  userId: string;
  username: string;
  positionKey: string;
  positionName: string | null;
  scopeType: string;
  scopeId: string | null;
  platoonName: string | null;
  grantorLabel: string | null;
  appointmentId: string | null;
  delegationId: string | null;
};

type SwitchableIdentitiesResponse = {
  message: string;
  items: SwitchableIdentityResponseItem[];
};

export async function getSwitchableIdentities() {
  const response = await api.get<SwitchableIdentitiesResponse>(endpoints.me.switchableIdentities, {
    baseURL,
  });
  return response.items;
}
