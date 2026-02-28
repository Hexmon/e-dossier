import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";
import type { PerformanceGraphData } from "@/types/performanceGraph";

export type PerformanceGraphResponse = {
  message: string;
  data: PerformanceGraphData;
};

export async function getPerformanceGraphData(ocId: string) {
  return api.get<PerformanceGraphResponse>(endpoints.oc.performanceGraph(ocId), {
    path: { ocId },
  });
}
