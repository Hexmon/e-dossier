import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { apiRequest } from "@/app/lib/apiClient";

export interface PhysicalTrainingScore {
  attemptCode: string;
  gradeCode: string;
  ptTaskScoreId: string;
  marksScored: number;
  semester?: number;
  taskTitle?: string;
  templateMaxMarks?: number;
}

export interface PhysicalTrainingTemplateRow {
  ptTaskScoreId: string; // can be "virtual:..." if backend doesn't give real id
  taskTitle: string;
  maxMarks: number; // ✅ from task.maxMarks (or grade.maxMarks if provided)
  semester: number;
  typeCode: string;
  typeTitle?: string;
  attemptCode?: string;
  gradeCode?: string;

  // extra ids for stable virtual keys (frontend only)
  taskId?: string;
  attemptId?: string;
  gradeId?: string;
}

export interface PhysicalTrainingTemplateTypeInfo {
  code: string;
  title: string;
  semester: number;
  maxTotalMarks: number;
  sortOrder: number;
}

export interface MotivationField {
  id: string;
  label: string;
  semester: number;
  sortOrder: number;
}

interface PTResponse {
  message: string;
  data: {
    semester?: number;
    scores: Array<{
      id: string;
      ptTaskScoreId: string;
      marksScored: number;
      createdAt: string;
      updatedAt: string;
    }>;
  };
}

export type UpdatePhysicalTrainingScores = (
  semester: number,
  scoresData: PhysicalTrainingScore[],
  deleteScoreIds?: string[]
) => Promise<void>;

export interface UsePTReturn {
  scores: PhysicalTrainingScore[];
  templatesByType: Record<string, PhysicalTrainingTemplateRow[]>;
  templateMetaByType: Record<string, PhysicalTrainingTemplateTypeInfo>;
  motivationFields: MotivationField[];
  loading: boolean;
  error: string | null;
  fetchScores: (semester: number) => Promise<void>;
  saveScores: (semester: number, scores: PhysicalTrainingScore[]) => Promise<void>;
  updateScores: (
    semester: number,
    scores: PhysicalTrainingScore[],
    deleteScoreIds?: string[]
  ) => Promise<void>;
  deleteScores: (semester: number, scoreIds?: string[]) => Promise<void>;
}

const makeVirtualScoreId = (parts: Array<string | undefined | null>) => {
  const safe = parts.map((p) => (p ?? "").toString().trim()).filter(Boolean).join(":");
  return `virtual:${safe}`;
};

export function usePhysicalTraining(ocId: string): UsePTReturn {
  const [scores, setScores] = useState<PhysicalTrainingScore[]>([]);
  const [templatesByType, setTemplatesByType] = useState<Record<string, PhysicalTrainingTemplateRow[]>>({});
  const [templateMetaByType, setTemplateMetaByType] = useState<Record<string, PhysicalTrainingTemplateTypeInfo>>({});
  const [motivationFields, setMotivationFields] = useState<MotivationField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchTrainingTemplates = useCallback(
    async (semester: number): Promise<{
      templates: Record<string, PhysicalTrainingTemplateRow[]>;
      motivationFields: MotivationField[];
      templateMeta: Record<string, PhysicalTrainingTemplateTypeInfo>;
    }> => {
      const data: any = await apiRequest<any>({
        method: "GET",
        endpoint: "/api/v1/admin/physical-training/templates",
        query: { semester },
      });

      const types = data?.data?.types ?? [];
      const templates: Record<string, PhysicalTrainingTemplateRow[]> = {};
      const templateMeta: Record<string, PhysicalTrainingTemplateTypeInfo> = {};

      types.forEach((type: any) => {
        if (!type?.code) return;

        const rows: PhysicalTrainingTemplateRow[] = [];
        const typeCode = type.code;
        const typeTitle = type.title;
        const typeSemester = type.semester;

        const typeLevelAttempts = Array.isArray(type?.attempts) ? type.attempts : [];
        const tasks = Array.isArray(type?.tasks) ? type.tasks : [];

        tasks.forEach((task: any) => {
          const taskId = task?.id;
          const taskTitle = task?.title ?? "PT Task";
          const taskMaxMarks = typeof task?.maxMarks === "number" ? task.maxMarks : 0;

          // Prefer task.attempts; fallback to type.attempts
          const taskAttempts = Array.isArray(task?.attempts) ? task.attempts : typeLevelAttempts;

          (taskAttempts ?? []).forEach((attempt: any) => {
            const attemptId = attempt?.id;
            const attemptCode = attempt?.code ?? "—";

            const grades = Array.isArray(attempt?.grades) ? attempt.grades : [];

            // If no grades exist (e.g. Swimming in your sample), create a placeholder grade
            if (grades.length === 0) {
              const virtualId = makeVirtualScoreId([typeCode, taskId, attemptId, "nograde"]);
              rows.push({
                ptTaskScoreId: virtualId,
                taskTitle,
                maxMarks: taskMaxMarks,
                semester: typeSemester,
                typeCode,
                typeTitle,
                attemptCode,
                gradeCode: "—",
                taskId,
                attemptId,
              });
              return;
            }

            grades.forEach((grade: any) => {
              const gradeId = grade?.id;
              const gradeCode = grade?.code ?? "—";

              // ✅ Use real scoreId if backend provides it; otherwise create a virtual one for UI rendering
              const realScoreId = typeof grade?.scoreId === "string" && grade.scoreId.trim() ? grade.scoreId : null;
              const ptTaskScoreId =
                realScoreId ??
                makeVirtualScoreId([typeCode, taskId, attemptId, gradeId, gradeCode]);

              // ✅ Max marks: grade.maxMarks if number else task.maxMarks
              const gradeMaxMarks =
                typeof grade?.maxMarks === "number" ? grade.maxMarks : taskMaxMarks;

              rows.push({
                ptTaskScoreId,
                taskTitle,
                maxMarks: gradeMaxMarks,
                semester: typeSemester,
                typeCode,
                typeTitle,
                attemptCode,
                gradeCode,
                taskId,
                attemptId,
                gradeId,
              });
            });
          });
        });

        templates[typeCode] = rows;
        templateMeta[typeCode] = {
          code: typeCode,
          title: typeTitle ?? typeCode,
          semester: typeSemester ?? 0,
          maxTotalMarks: typeof type?.maxTotalMarks === "number" ? type.maxTotalMarks : 0,
          sortOrder: typeof type?.sortOrder === "number" ? type.sortOrder : 0,
        };
      });

      const motivationFields: MotivationField[] = data?.data?.motivationFields ?? [];
      return { templates, motivationFields, templateMeta };
    },
    []
  );

  const fetchScores = useCallback(
    async (semester: number) => {
      if (!ocId) {
        setError("OC ID is required");
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Cancel previous request if any
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();

        const templatePromise = fetchTrainingTemplates(semester).catch((err) => {
          console.error("Error fetching PT templates:", err);
          return { templates: {}, motivationFields: [], templateMeta: {} };
        });

        const [scoresResponse, templateResult] = await Promise.all([
          apiRequest<any>({
            method: "GET",
            endpoint: `/api/v1/oc/${ocId}/physical-training`,
            query: { semester },
            signal: abortControllerRef.current.signal,
          }),
          templatePromise,
        ]);

        // Enrich scores with template data (only works if template has real ptTaskScoreId)
        const enrichedScores: PhysicalTrainingScore[] = (scoresResponse.data.scores || []).map((score: any) => {
          let templateRow: PhysicalTrainingTemplateRow | undefined;
          for (const typeRows of Object.values(templateResult.templates)) {
            templateRow = typeRows.find((row) => row.ptTaskScoreId === score.ptTaskScoreId);
            if (templateRow) break;
          }

          return {
            ptTaskScoreId: score.ptTaskScoreId,
            marksScored: score.marksScored,
            attemptCode: templateRow?.attemptCode || "",
            gradeCode: templateRow?.gradeCode || "",
            semester,
            taskTitle: templateRow?.taskTitle,
            templateMaxMarks: templateRow?.maxMarks,
          };
        });

        setScores(enrichedScores);
        setTemplatesByType(templateResult.templates);
        setTemplateMetaByType(templateResult.templateMeta ?? {});
        setMotivationFields(templateResult.motivationFields);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          const errorMsg = err.message || "Failed to fetch physical training scores";
          setError(errorMsg);
          console.error("Error fetching PT scores:", err);
        }
      } finally {
        setLoading(false);
      }
    },
    [ocId, fetchTrainingTemplates]
  );

  const saveScores = useCallback(
    async (semester: number, scoresData: PhysicalTrainingScore[]) => {
      if (!ocId) {
        toast.error("OC ID is required");
        return;
      }

      if (!scoresData || scoresData.length === 0) return;

      try {
        setLoading(true);
        setError(null);

        const data: PTResponse = await apiRequest<PTResponse, { semester: number; scores: PhysicalTrainingScore[] }>({
          method: "POST",
          endpoint: `/api/v1/oc/${ocId}/physical-training`,
          body: { semester, scores: scoresData },
        });

        const enrichedScores: PhysicalTrainingScore[] = (data.data.scores || []).map((score: any) => {
          let templateRow: PhysicalTrainingTemplateRow | undefined;
          for (const typeRows of Object.values(templatesByType)) {
            templateRow = typeRows.find((row) => row.ptTaskScoreId === score.ptTaskScoreId);
            if (templateRow) break;
          }
          return {
            ptTaskScoreId: score.ptTaskScoreId,
            marksScored: score.marksScored,
            attemptCode: templateRow?.attemptCode || "",
            gradeCode: templateRow?.gradeCode || "",
            semester,
            taskTitle: templateRow?.taskTitle,
            templateMaxMarks: templateRow?.maxMarks,
          };
        });

        setScores(enrichedScores);
        toast.success("Physical training scores saved successfully");
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to save physical training scores";
        setError(errorMsg);
        toast.error(errorMsg);
        console.error("Error saving PT scores:", err);
      } finally {
        setLoading(false);
      }
    },
    [ocId, templatesByType]
  );

  const updateScores = useCallback(
    async (semester: number, scoresData: PhysicalTrainingScore[], deleteScoreIds?: string[]) => {
      if (!ocId) {
        toast.error("OC ID is required");
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const data: PTResponse = await apiRequest<PTResponse, any>({
          method: "PATCH",
          endpoint: `/api/v1/oc/${ocId}/physical-training`,
          body: {
            semester,
            scores: scoresData && scoresData.length > 0 ? scoresData : undefined,
            deleteScoreIds: deleteScoreIds && deleteScoreIds.length > 0 ? deleteScoreIds : undefined,
          },
        });

        const enrichedScores: PhysicalTrainingScore[] = (data.data.scores || []).map((score: any) => {
          let templateRow: PhysicalTrainingTemplateRow | undefined;
          for (const typeRows of Object.values(templatesByType)) {
            templateRow = typeRows.find((row) => row.ptTaskScoreId === score.ptTaskScoreId);
            if (templateRow) break;
          }
          return {
            ptTaskScoreId: score.ptTaskScoreId,
            marksScored: score.marksScored,
            attemptCode: templateRow?.attemptCode || "",
            gradeCode: templateRow?.gradeCode || "",
            semester,
            taskTitle: templateRow?.taskTitle,
            templateMaxMarks: templateRow?.maxMarks,
          };
        });

        setScores(enrichedScores);
        toast.success("Physical training scores updated successfully");
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to update physical training scores";
        setError(errorMsg);
        toast.error(errorMsg);
        console.error("Error updating PT scores:", err);
      } finally {
        setLoading(false);
      }
    },
    [ocId, templatesByType]
  );

  const deleteScores = useCallback(
    async (semester: number, scoreIds?: string[]) => {
      if (!ocId) {
        toast.error("OC ID is required");
        return;
      }

      try {
        setLoading(true);
        setError(null);

        await apiRequest<PTResponse, any>({
          method: "DELETE",
          endpoint: `/api/v1/oc/${ocId}/physical-training`,
          body: {
            semester,
            scoreIds: scoreIds && scoreIds.length > 0 ? scoreIds : undefined,
          },
        });

        await fetchScores(semester);
        toast.success("Physical training scores deleted successfully");
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to delete physical training scores";
        setError(errorMsg);
        toast.error(errorMsg);
        console.error("Error deleting PT scores:", err);
      } finally {
        setLoading(false);
      }
    },
    [ocId, fetchScores]
  );

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  return {
    scores,
    templatesByType,
    templateMetaByType,
    motivationFields,
    loading,
    error,
    fetchScores,
    saveScores,
    updateScores,
    deleteScores,
  };
}
