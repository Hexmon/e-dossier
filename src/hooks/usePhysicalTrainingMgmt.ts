// hooks/usePhysicalTrainingMgmt.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    getPTTemplate,
    listPTTypes,
    createPTType,
    updatePTType,
    deletePTType,
    listPTAttempts,
    createPTAttempt,
    updatePTAttempt,
    deletePTAttempt,
    listPTGrades,
    createPTGrade,
    updatePTGrade,
    deletePTGrade,
    listPTTasks,
    createPTTask,
    updatePTTask,
    deletePTTask,
    listPTTaskScores,
    createPTTaskScore,
    updatePTTaskScore,
    deletePTTaskScore,
    listPTMotivationFields,
    createPTMotivationField,
    updatePTMotivationField,
    deletePTMotivationField,
    PTTypeCreate,
    PTTypeUpdate,
    PTAttemptCreate,
    PTAttemptUpdate,
    PTGradeCreate,
    PTGradeUpdate,
    PTTaskCreate,
    PTTaskUpdate,
    PTTaskScoreCreate,
    PTTaskScoreUpdate,
    PTMotivationFieldCreate,
    PTMotivationFieldUpdate,
    DeleteOptions,
} from "@/app/lib/api/Physicaltrainingapi";

// ---------------------------------------------------------------------------
// Query key factory — single source of truth for all keys + invalidation
// ---------------------------------------------------------------------------
const QK = {
    template: (semester: number) => ["pt", "template", semester] as const,
    types: (semester: number) => ["pt", "types", semester] as const,
    motivationFields: (semester: number) => ["pt", "motivationFields", semester] as const,
    attempts: (typeId: string) => ["pt", "attempts", typeId] as const,
    tasks: (typeId: string) => ["pt", "tasks", typeId] as const,
    // allGrades fetches grades across every attempt for a given type
    allGrades: (typeId: string) => ["pt", "allGrades", typeId] as const,
    // grades scoped to a single attempt (used by the Grades tab when an attempt is selected)
    grades: (typeId: string, attemptId: string) => ["pt", "grades", typeId, attemptId] as const,
    taskScores: (typeId: string, taskId: string) => ["pt", "taskScores", typeId, taskId] as const,
} as const;

// ---------------------------------------------------------------------------
// Hook options — all IDs flow in from the page's local state
// ---------------------------------------------------------------------------
export interface UsePhysicalTrainingMgmtOptions {
    semester: number;
    typeId: string | null;
    attemptId: string | null;
    taskId: string | null;
}

export function usePhysicalTrainingMgmt(options: UsePhysicalTrainingMgmtOptions) {
    const { semester, typeId, attemptId, taskId } = options;
    const queryClient = useQueryClient();

    // Derived booleans — keeps every `enabled` guard readable
    const hasType = typeId !== null && typeId.length > 0;
    const hasAttempt = hasType && attemptId !== null && attemptId.length > 0;
    const hasTask = hasType && taskId !== null && taskId.length > 0;

    // -----------------------------------------------------------------------
    // Queries
    // -----------------------------------------------------------------------
    const templateQuery = useQuery({
        queryKey: QK.template(semester),
        queryFn: () => getPTTemplate(semester),
        staleTime: 5 * 60 * 1000,
    });

    const typesQuery = useQuery({
        queryKey: QK.types(semester),
        queryFn: async () => {
            const data = await listPTTypes(semester);
            return data?.items ?? [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const motivationFieldsQuery = useQuery({
        queryKey: QK.motivationFields(semester),
        queryFn: async () => {
            const data = await listPTMotivationFields(semester);
            return data?.items ?? [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const attemptsQuery = useQuery({
        queryKey: QK.attempts(typeId!),
        queryFn: async () => {
            const data = await listPTAttempts(typeId!);
            return data?.items ?? [];
        },
        enabled: hasType,
        staleTime: 5 * 60 * 1000,
    });

    const tasksQuery = useQuery({
        queryKey: QK.tasks(typeId!),
        queryFn: async () => {
            const data = await listPTTasks(typeId!);
            return data?.items ?? [];
        },
        enabled: hasType,
        staleTime: 5 * 60 * 1000,
    });

    // Fetches grades for EVERY attempt under this type (used by Scores tab and
    // as the default Grades view before a specific attempt is picked).
    const allGradesQuery = useQuery({
        queryKey: QK.allGrades(typeId!),
        queryFn: async () => {
            const attemptsData = await listPTAttempts(typeId!);
            const attemptsList = attemptsData?.items ?? [];

            const results = await Promise.allSettled(
                attemptsList.map((attempt) => listPTGrades(typeId!, attempt.id))
            );

            return results.flatMap((result) =>
                result.status === "fulfilled" ? (result.value?.items ?? []) : []
            );
        },
        enabled: hasType,
        staleTime: 5 * 60 * 1000,
    });

    // Grades scoped to one attempt — only enabled when the user picks one
    const gradesQuery = useQuery({
        queryKey: QK.grades(typeId!, attemptId!),
        queryFn: async () => {
            const data = await listPTGrades(typeId!, attemptId!);
            return data?.items ?? [];
        },
        enabled: hasAttempt,
        staleTime: 5 * 60 * 1000,
    });

    const taskScoresQuery = useQuery({
        queryKey: QK.taskScores(typeId!, taskId!),
        queryFn: async () => {
            const data = await listPTTaskScores(typeId!, taskId!);
            return data?.items ?? [];
        },
        enabled: hasTask,
        staleTime: 5 * 60 * 1000,
    });

    // -----------------------------------------------------------------------
    // Type mutations
    // -----------------------------------------------------------------------
    const createTypeMutation = useMutation({
        mutationFn: (payload: PTTypeCreate) => createPTType(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QK.types(semester) });
            toast.success("PT Type created successfully");
        },
        onError: (error) => {
            console.error("Error creating PT type:", error);
            toast.error("Failed to create PT type");
        },
    });

    const updateTypeMutation = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: PTTypeUpdate }) =>
            updatePTType(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QK.types(semester) });
            toast.success("PT Type updated successfully");
        },
        onError: (error) => {
            console.error("Error updating PT type:", error);
            toast.error("Failed to update PT type");
        },
    });

    const deleteTypeMutation = useMutation({
        mutationFn: ({ id, opts }: { id: string; opts?: DeleteOptions }) =>
            deletePTType(id, opts),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QK.types(semester) });
            toast.success("PT Type deleted successfully");
        },
        onError: (error) => {
            console.error("Error deleting PT type:", error);
            toast.error("Failed to delete PT type");
        },
    });

    // -----------------------------------------------------------------------
    // Attempt mutations
    // -----------------------------------------------------------------------
    const createAttemptMutation = useMutation({
        mutationFn: ({ tid, payload }: { tid: string; payload: PTAttemptCreate }) =>
            createPTAttempt(tid, payload),
        onSuccess: (_, { tid }) => {
            queryClient.invalidateQueries({ queryKey: QK.attempts(tid) });
            // allGrades depends on the attempt list, so refresh it too
            queryClient.invalidateQueries({ queryKey: QK.allGrades(tid) });
            toast.success("Attempt created successfully");
        },
        onError: (error) => {
            console.error("Error creating attempt:", error);
            toast.error("Failed to create attempt");
        },
    });

    const updateAttemptMutation = useMutation({
        mutationFn: ({ tid, id, updates }: { tid: string; id: string; updates: PTAttemptUpdate }) =>
            updatePTAttempt(tid, id, updates),
        onSuccess: (_, { tid }) => {
            queryClient.invalidateQueries({ queryKey: QK.attempts(tid) });
            toast.success("Attempt updated successfully");
        },
        onError: (error) => {
            console.error("Error updating attempt:", error);
            toast.error("Failed to update attempt");
        },
    });

    const deleteAttemptMutation = useMutation({
        mutationFn: ({ tid, id, opts }: { tid: string; id: string; opts?: DeleteOptions }) =>
            deletePTAttempt(tid, id, opts),
        onSuccess: (_, { tid }) => {
            queryClient.invalidateQueries({ queryKey: QK.attempts(tid) });
            queryClient.invalidateQueries({ queryKey: QK.allGrades(tid) });
            toast.success("Attempt deleted successfully");
        },
        onError: (error) => {
            console.error("Error deleting attempt:", error);
            toast.error("Failed to delete attempt");
        },
    });

    // -----------------------------------------------------------------------
    // Grade mutations
    // -----------------------------------------------------------------------
    const createGradeMutation = useMutation({
        mutationFn: ({ tid, aid, payload }: { tid: string; aid: string; payload: PTGradeCreate }) =>
            createPTGrade(tid, aid, payload),
        onSuccess: (_, { tid, aid }) => {
            queryClient.invalidateQueries({ queryKey: QK.grades(tid, aid) });
            queryClient.invalidateQueries({ queryKey: QK.allGrades(tid) });
            toast.success("Grade created successfully");
        },
        onError: (error) => {
            console.error("Error creating grade:", error);
            toast.error("Failed to create grade");
        },
    });

    const updateGradeMutation = useMutation({
        mutationFn: ({ tid, aid, id, updates }: {
            tid: string; aid: string; id: string; updates: PTGradeUpdate;
        }) => updatePTGrade(tid, aid, id, updates),
        onSuccess: (_, { tid, aid }) => {
            queryClient.invalidateQueries({ queryKey: QK.grades(tid, aid) });
            queryClient.invalidateQueries({ queryKey: QK.allGrades(tid) });
            toast.success("Grade updated successfully");
        },
        onError: (error) => {
            console.error("Error updating grade:", error);
            toast.error("Failed to update grade");
        },
    });

    const deleteGradeMutation = useMutation({
        mutationFn: ({ tid, aid, id, opts }: {
            tid: string; aid: string; id: string; opts?: DeleteOptions;
        }) => deletePTGrade(tid, aid, id, opts),
        onSuccess: (_, { tid, aid }) => {
            queryClient.invalidateQueries({ queryKey: QK.grades(tid, aid) });
            queryClient.invalidateQueries({ queryKey: QK.allGrades(tid) });
            toast.success("Grade deleted successfully");
        },
        onError: (error) => {
            console.error("Error deleting grade:", error);
            toast.error("Failed to delete grade");
        },
    });

    // -----------------------------------------------------------------------
    // Task mutations
    // -----------------------------------------------------------------------
    const createTaskMutation = useMutation({
        mutationFn: ({ tid, payload }: { tid: string; payload: PTTaskCreate }) =>
            createPTTask(tid, payload),
        onSuccess: (_, { tid }) => {
            queryClient.invalidateQueries({ queryKey: QK.tasks(tid) });
            toast.success("Task created successfully");
        },
        onError: (error) => {
            console.error("Error creating task:", error);
            toast.error("Failed to create task");
        },
    });

    const updateTaskMutation = useMutation({
        mutationFn: ({ tid, id, updates }: { tid: string; id: string; updates: PTTaskUpdate }) =>
            updatePTTask(tid, id, updates),
        onSuccess: (_, { tid }) => {
            queryClient.invalidateQueries({ queryKey: QK.tasks(tid) });
            toast.success("Task updated successfully");
        },
        onError: (error) => {
            console.error("Error updating task:", error);
            toast.error("Failed to update task");
        },
    });

    const deleteTaskMutation = useMutation({
        mutationFn: ({ tid, id, opts }: { tid: string; id: string; opts?: DeleteOptions }) =>
            deletePTTask(tid, id, opts),
        onSuccess: (_, { tid }) => {
            queryClient.invalidateQueries({ queryKey: QK.tasks(tid) });
            toast.success("Task deleted successfully");
        },
        onError: (error) => {
            console.error("Error deleting task:", error);
            toast.error("Failed to delete task");
        },
    });

    // -----------------------------------------------------------------------
    // Task score mutations
    // -----------------------------------------------------------------------
    const createTaskScoreMutation = useMutation({
        mutationFn: ({ tid, taskId: tskId, payload }: {
            tid: string; taskId: string; payload: PTTaskScoreCreate;
        }) => createPTTaskScore(tid, tskId, payload),
        onSuccess: (_, { tid, taskId: tskId }) => {
            queryClient.invalidateQueries({ queryKey: QK.taskScores(tid, tskId) });
            toast.success("Task score created successfully");
        },
        onError: (error) => {
            console.error("Error creating task score:", error);
            toast.error("Failed to create task score");
        },
    });

    const updateTaskScoreMutation = useMutation({
        mutationFn: ({ tid, taskId: tskId, id, updates }: {
            tid: string; taskId: string; id: string; updates: PTTaskScoreUpdate;
        }) => updatePTTaskScore(tid, tskId, id, updates),
        onSuccess: (_, { tid, taskId: tskId }) => {
            queryClient.invalidateQueries({ queryKey: QK.taskScores(tid, tskId) });
            toast.success("Task score updated successfully");
        },
        onError: (error) => {
            console.error("Error updating task score:", error);
            toast.error("Failed to update task score");
        },
    });

    const deleteTaskScoreMutation = useMutation({
        mutationFn: ({ tid, taskId: tskId, id }: {
            tid: string; taskId: string; id: string;
        }) => deletePTTaskScore(tid, tskId, id),
        onSuccess: (_, { tid, taskId: tskId }) => {
            queryClient.invalidateQueries({ queryKey: QK.taskScores(tid, tskId) });
            toast.success("Task score deleted successfully");
        },
        onError: (error) => {
            console.error("Error deleting task score:", error);
            toast.error("Failed to delete task score");
        },
    });

    // -----------------------------------------------------------------------
    // Motivation field mutations
    // -----------------------------------------------------------------------
    const createMotivationFieldMutation = useMutation({
        mutationFn: (payload: PTMotivationFieldCreate) => createPTMotivationField(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QK.motivationFields(semester) });
            toast.success("Motivation field created successfully");
        },
        onError: (error) => {
            console.error("Error creating motivation field:", error);
            toast.error("Failed to create motivation field");
        },
    });

    const updateMotivationFieldMutation = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: PTMotivationFieldUpdate }) =>
            updatePTMotivationField(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QK.motivationFields(semester) });
            toast.success("Motivation field updated successfully");
        },
        onError: (error) => {
            console.error("Error updating motivation field:", error);
            toast.error("Failed to update motivation field");
        },
    });

    const deleteMotivationFieldMutation = useMutation({
        mutationFn: ({ id, opts }: { id: string; opts?: DeleteOptions }) =>
            deletePTMotivationField(id, opts),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QK.motivationFields(semester) });
            toast.success("Motivation field deleted successfully");
        },
        onError: (error) => {
            console.error("Error deleting motivation field:", error);
            toast.error("Failed to delete motivation field");
        },
    });

    // -----------------------------------------------------------------------
    // Derived loading state
    // -----------------------------------------------------------------------
    const loading =
        templateQuery.isLoading ||
        typesQuery.isLoading ||
        motivationFieldsQuery.isLoading ||
        (hasType && attemptsQuery.isLoading) ||
        (hasType && tasksQuery.isLoading) ||
        (hasType && allGradesQuery.isLoading) ||
        (hasAttempt && gradesQuery.isLoading) ||
        (hasTask && taskScoresQuery.isLoading);

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------
    return {
        // ---- State --------------------------------------------------------
        loading,
        template: templateQuery.data ?? null,
        types: typesQuery.data ?? [],
        motivationFields: motivationFieldsQuery.data ?? [],
        attempts: attemptsQuery.data ?? [],
        tasks: tasksQuery.data ?? [],
        // The page uses `grades` for the per-attempt view when attemptId is
        // set, but falls back to allGrades (every attempt) otherwise.
        grades: hasAttempt ? (gradesQuery.data ?? []) : (allGradesQuery.data ?? []),
        taskScores: taskScoresQuery.data ?? [],

        // ---- Type operations ----------------------------------------------
        addType: (payload: PTTypeCreate) => createTypeMutation.mutateAsync(payload),
        editType: (id: string, updates: PTTypeUpdate) =>
            updateTypeMutation.mutateAsync({ id, updates }),
        removeType: (id: string, opts?: DeleteOptions) =>
            deleteTypeMutation.mutateAsync({ id, opts }),

        // ---- Attempt operations -------------------------------------------
        addAttempt: (tid: string, payload: PTAttemptCreate) =>
            createAttemptMutation.mutateAsync({ tid, payload }),
        editAttempt: (tid: string, id: string, updates: PTAttemptUpdate) =>
            updateAttemptMutation.mutateAsync({ tid, id, updates }),
        removeAttempt: (tid: string, id: string, opts?: DeleteOptions) =>
            deleteAttemptMutation.mutateAsync({ tid, id, opts }),

        // ---- Grade operations ---------------------------------------------
        addGrade: (tid: string, aid: string, payload: PTGradeCreate) =>
            createGradeMutation.mutateAsync({ tid, aid, payload }),
        editGrade: (tid: string, aid: string, id: string, updates: PTGradeUpdate) =>
            updateGradeMutation.mutateAsync({ tid, aid, id, updates }),
        removeGrade: (tid: string, aid: string, id: string, opts?: DeleteOptions) =>
            deleteGradeMutation.mutateAsync({ tid, aid, id, opts }),

        // ---- Task operations ----------------------------------------------
        addTask: (tid: string, payload: PTTaskCreate) =>
            createTaskMutation.mutateAsync({ tid, payload }),
        editTask: (tid: string, id: string, updates: PTTaskUpdate) =>
            updateTaskMutation.mutateAsync({ tid, id, updates }),
        removeTask: (tid: string, id: string, opts?: DeleteOptions) =>
            deleteTaskMutation.mutateAsync({ tid, id, opts }),

        // ---- Task score operations ----------------------------------------
        addTaskScore: (tid: string, tskId: string, payload: PTTaskScoreCreate) =>
            createTaskScoreMutation.mutateAsync({ tid, taskId: tskId, payload }),
        editTaskScore: (tid: string, tskId: string, id: string, updates: PTTaskScoreUpdate) =>
            updateTaskScoreMutation.mutateAsync({ tid, taskId: tskId, id, updates }),
        removeTaskScore: (tid: string, tskId: string, id: string) =>
            deleteTaskScoreMutation.mutateAsync({ tid, taskId: tskId, id }),

        // ---- Motivation field operations ----------------------------------
        addMotivationField: (payload: PTMotivationFieldCreate) =>
            createMotivationFieldMutation.mutateAsync(payload),
        editMotivationField: (id: string, updates: PTMotivationFieldUpdate) =>
            updateMotivationFieldMutation.mutateAsync({ id, updates }),
        removeMotivationField: (id: string, opts?: DeleteOptions) =>
            deleteMotivationFieldMutation.mutateAsync({ id, opts }),
    };
}