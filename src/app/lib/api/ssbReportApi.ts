import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";

export interface SsbNote {
  note: string;
  by: string;
}

export interface SsbReport {
  positives: SsbNote[];
  negatives: SsbNote[];
  predictiveRating: number;
  scopeForImprovement: string;
}

export interface ApiResponse<T = any> {
  status: number;
  ok?: boolean;
  data?: T;
}

export interface SsbPayload {
  positives: SsbNote[];
  negatives: SsbNote[];
  predictiveRating: number;
  scopeForImprovement: string;
}

export async function saveSsbReport(
  ocId: string,
  report: SsbReport
): Promise<ApiResponse<SsbReport>> {
  try {
    const response = (await api.post(
      endpoints.oc.ssbreport(ocId),
      report
    )) as ApiResponse<SsbReport>;

    console.log("SSB Report POST:", response);
    return response;
  } catch (error) {
    console.error("Error saving SSB report:", error);
    throw error;
  }
}

export async function getSsbReport(
  ocId: string
): Promise<SsbReport | null> {
  try {
    const response = (await api.get(
      endpoints.oc.ssbreport(ocId),
    )) as SsbReport;

    console.log("SSB Report GET response data:", response);

    if (response) return response;
    return null;
  } catch (error) {
    console.error("Error fetching SSB report:", error);
    return null;
  }
}

export async function updateSsbReport(
  ocId: string,
  payload: Partial<SsbReport>
): Promise<ApiResponse<SsbReport>> {
  try {
    const response = (await api.patch(
      endpoints.oc.ssbreport(ocId),
      payload
    )) as ApiResponse<SsbReport>;

    console.log("SSB Report PATCH:", response);
    return response;
  } catch (error) {
    console.error("Error updating SSB report:", error);
    throw error;
  }
}
