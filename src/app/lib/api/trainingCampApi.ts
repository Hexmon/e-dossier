import { api } from "@/app/lib/apiClient";

export interface TrainingCampReference {
  id: string;
  name: string;
  semester: string;
  maxTotalMarks: number;
  activities?: Array<{
    id: string;
    name: string;
    defaultMaxMarks: number;
    sortOrder: number;
  }>;
}

interface TrainingCampsResponse {
  items: TrainingCampReference[];
  count: number;
}

export async function fetchTrainingCampReferences(): Promise<TrainingCampReference[]> {
  const response = await api.get<TrainingCampsResponse>("/v1/training-camps?includeActivities=true");
  return response.items;
}
