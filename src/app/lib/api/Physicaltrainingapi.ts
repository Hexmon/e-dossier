import { api } from "@/app/lib/apiClient";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PTType {
    id: string;
    courseId: string | null;
    semester: number;
    code: string;
    title: string;
    maxTotalMarks: number;
    sortOrder: number;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

export interface PTAttempt {
    id: string;
    ptTypeId: string;
    code: string;
    label: string;
    isCompensatory: boolean;
    sortOrder: number;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

export interface PTGrade {
    id: string;
    ptAttemptId: string;
    code: string;
    label: string;
    sortOrder: number;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

export interface PTTask {
    id: string;
    ptTypeId: string;
    title: string;
    maxMarks: number;
    sortOrder: number;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

export interface PTTaskScore {
    id: string;
    ptTaskId: string;
    ptAttemptId: string;
    ptAttemptGradeId: string;
    maxMarks: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface PTMotivationField {
    id: string;
    courseId: string | null;
    semester: number;
    label: string;
    sortOrder: number;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

export interface PTTemplate {
    courseId: string | null;
    semester: number;
    types: PTTemplateType[];
    motivationFields: PTMotivationField[];
}

export interface PTTemplateCopyStats {
    created: number;
    updated: number;
    deactivated: number;
    deleted: number;
    preserved: number;
}

export interface PTTemplateCopyPayload {
    sourceCourseId: string;
    targetCourseId: string;
    semester: number;
    mode?: "replace";
}

export interface PTTemplateCopyResponse {
    message: string;
    sourceCourseId: string;
    targetCourseId: string;
    semester: number;
    mode: "replace";
    createdCount: number;
    updatedCount: number;
    deactivatedCount: number;
    deletedCount: number;
    preservedCount: number;
    warnings: string[];
    stats: {
        types: PTTemplateCopyStats;
        attempts: PTTemplateCopyStats;
        grades: PTTemplateCopyStats;
        tasks: PTTemplateCopyStats;
        taskScores: PTTemplateCopyStats;
        motivationFields: PTTemplateCopyStats;
    };
}

export interface PTTemplateType extends PTType {
    attempts: PTTemplateAttempt[];
    tasks: PTTemplateTask[];
}

export interface PTTemplateAttempt extends PTAttempt {
    grades: PTTemplateGrade[];
}

export interface PTTemplateGrade {
    id: string;
    code: string;
    label: string;
    maxMarks: number | null;
    scoreId: string | null;
}

export interface PTTemplateTask extends PTTask {
    attempts: PTTemplateTaskAttempt[];
}

export interface PTTemplateTaskAttempt {
    id: string;
    code: string;
    grades: PTTemplateTaskGrade[];
}

export interface PTTemplateTaskGrade {
    code: string;
    maxMarks: number | null;
    scoreId: string | null;
}

// ============================================================================
// CREATE/UPDATE TYPES
// ============================================================================

export interface PTTypeCreate {
    courseId?: string;
    semester: number;
    code: string;
    title: string;
    maxTotalMarks: number;
    sortOrder?: number;
    isActive?: boolean;
}

export interface PTTypeUpdate {
    courseId?: string;
    code?: string;
    title?: string;
    maxTotalMarks?: number;
    sortOrder?: number;
    isActive?: boolean;
}

export interface PTAttemptCreate {
    code: string;
    label: string;
    isCompensatory: boolean;
    sortOrder?: number;
    isActive?: boolean;
}

export interface PTAttemptUpdate {
    code?: string;
    label?: string;
    isCompensatory?: boolean;
    sortOrder?: number;
    isActive?: boolean;
}

export interface PTGradeCreate {
    code: string;
    label: string;
    sortOrder?: number;
    isActive?: boolean;
}

export interface PTGradeUpdate {
    code?: string;
    label?: string;
    sortOrder?: number;
    isActive?: boolean;
}

export interface PTTaskCreate {
    title: string;
    maxMarks: number;
    sortOrder?: number;
}

export interface PTTaskUpdate {
    title?: string;
    maxMarks?: number;
    sortOrder?: number;
}

export interface PTTaskScoreCreate {
    ptAttemptId: string;
    ptAttemptGradeId: string;
    maxMarks: number;
}

export interface PTTaskScoreUpdate {
    maxMarks: number;
}

export interface PTMotivationFieldCreate {
    courseId?: string;
    semester: number;
    label: string;
    sortOrder?: number;
    isActive?: boolean;
}

export interface PTMotivationFieldUpdate {
    courseId?: string;
    label?: string;
    sortOrder?: number;
    isActive?: boolean;
}

export interface DeleteOptions {
    hard?: boolean;
}

// ============================================================================
// TEMPLATE API
// ============================================================================

export async function getPTTemplate(courseIdOrSemester: string | number, maybeSemester?: number): Promise<PTTemplate> {
    const courseId = typeof courseIdOrSemester === "string" ? courseIdOrSemester : undefined;
    const semester = typeof courseIdOrSemester === "number" ? courseIdOrSemester : (maybeSemester as number);
    const response = await api.get<{ data: PTTemplate }>(
        `/api/v1/admin/physical-training/templates`,
        { query: { ...(courseId ? { courseId } : {}), semester } }
    );
    return response.data;
}

export async function copyPTTemplate(
    payload: PTTemplateCopyPayload
): Promise<PTTemplateCopyResponse> {
    return api.post<PTTemplateCopyResponse, PTTemplateCopyPayload>(
        `/api/v1/admin/physical-training/templates/copy`,
        payload
    );
}

// ============================================================================
// PT TYPES API
// ============================================================================

export async function listPTTypes(
    courseIdOrSemester: string | number,
    maybeSemester?: number,
): Promise<{ items: PTType[]; count: number }> {
    const courseId = typeof courseIdOrSemester === "string" ? courseIdOrSemester : undefined;
    const semester = typeof courseIdOrSemester === "number" ? courseIdOrSemester : (maybeSemester as number);
    return await api.get<{ items: PTType[]; count: number }>(
        `/api/v1/admin/physical-training/types`,
        { query: { ...(courseId ? { courseId } : {}), semester } }
    );
}

export async function getPTTypeById(typeId: string): Promise<PTType> {
    const response = await api.get<{ ptType: PTType }>(
        `/api/v1/admin/physical-training/types/${typeId}`
    );
    return response.ptType;
}

export async function createPTType(payload: PTTypeCreate): Promise<PTType> {
    const response = await api.post<{ ptType: PTType }, PTTypeCreate>(
        `/api/v1/admin/physical-training/types`,
        payload
    );
    return response.ptType;
}

export async function updatePTType(typeId: string, payload: PTTypeUpdate): Promise<PTType> {
    const response = await api.patch<{ ptType: PTType }, PTTypeUpdate>(
        `/api/v1/admin/physical-training/types/${typeId}`,
        payload
    );
    return response.ptType;
}

export async function deletePTType(typeId: string, options?: DeleteOptions): Promise<void> {
    const endpoint = `/api/v1/admin/physical-training/types/${typeId}`;
    if (options) {
        await api.request({ method: "DELETE", endpoint, body: options });
    } else {
        await api.delete(endpoint);
    }
}

// ============================================================================
// PT ATTEMPTS API
// ============================================================================

export async function listPTAttempts(typeId: string): Promise<{ items: PTAttempt[]; count: number }> {
    return await api.get<{ items: PTAttempt[]; count: number }>(
        `/api/v1/admin/physical-training/types/${typeId}/attempts`
    );
}

export async function getPTAttemptById(typeId: string, attemptId: string): Promise<PTAttempt> {
    const response = await api.get<{ ptAttempt: PTAttempt }>(
        `/api/v1/admin/physical-training/types/${typeId}/attempts/${attemptId}`
    );
    return response.ptAttempt;
}

export async function createPTAttempt(typeId: string, payload: PTAttemptCreate): Promise<PTAttempt> {
    const response = await api.post<{ ptAttempt: PTAttempt }, PTAttemptCreate>(
        `/api/v1/admin/physical-training/types/${typeId}/attempts`,
        payload
    );
    return response.ptAttempt;
}

export async function updatePTAttempt(
    typeId: string,
    attemptId: string,
    payload: PTAttemptUpdate
): Promise<PTAttempt> {
    const response = await api.patch<{ ptAttempt: PTAttempt }, PTAttemptUpdate>(
        `/api/v1/admin/physical-training/types/${typeId}/attempts/${attemptId}`,
        payload
    );
    return response.ptAttempt;
}

export async function deletePTAttempt(
    typeId: string,
    attemptId: string,
    options?: DeleteOptions
): Promise<void> {
    const endpoint = `/api/v1/admin/physical-training/types/${typeId}/attempts/${attemptId}`;
    if (options) {
        await api.request({ method: "DELETE", endpoint, body: options });
    } else {
        await api.delete(endpoint);
    }
}

// ============================================================================
// PT GRADES API
// ============================================================================

export async function listPTGrades(
    typeId: string,
    attemptId: string
): Promise<{ items: PTGrade[]; count: number }> {
    return await api.get<{ items: PTGrade[]; count: number }>(
        `/api/v1/admin/physical-training/types/${typeId}/attempts/${attemptId}/grades`
    );
}

export async function getPTGradeById(
    typeId: string,
    attemptId: string,
    gradeId: string
): Promise<PTGrade> {
    const response = await api.get<{ ptGrade: PTGrade }>(
        `/api/v1/admin/physical-training/types/${typeId}/attempts/${attemptId}/grades/${gradeId}`
    );
    return response.ptGrade;
}

export async function createPTGrade(
    typeId: string,
    attemptId: string,
    payload: PTGradeCreate
): Promise<PTGrade> {
    const response = await api.post<{ ptGrade: PTGrade }, PTGradeCreate>(
        `/api/v1/admin/physical-training/types/${typeId}/attempts/${attemptId}/grades`,
        payload
    );
    return response.ptGrade;
}

export async function updatePTGrade(
    typeId: string,
    attemptId: string,
    gradeId: string,
    payload: PTGradeUpdate
): Promise<PTGrade> {
    const response = await api.patch<{ ptGrade: PTGrade }, PTGradeUpdate>(
        `/api/v1/admin/physical-training/types/${typeId}/attempts/${attemptId}/grades/${gradeId}`,
        payload
    );
    return response.ptGrade;
}

export async function deletePTGrade(
    typeId: string,
    attemptId: string,
    gradeId: string,
    options?: DeleteOptions
): Promise<void> {
    const endpoint = `/api/v1/admin/physical-training/types/${typeId}/attempts/${attemptId}/grades/${gradeId}`;
    if (options) {
        await api.request({ method: "DELETE", endpoint, body: options });
    } else {
        await api.delete(endpoint);
    }
}

// ============================================================================
// PT TASKS API
// ============================================================================

export async function listPTTasks(typeId: string): Promise<{ items: PTTask[]; count: number }> {
    return await api.get<{ items: PTTask[]; count: number }>(
        `/api/v1/admin/physical-training/types/${typeId}/tasks`
    );
}

export async function getPTTaskById(typeId: string, taskId: string): Promise<PTTask> {
    const response = await api.get<{ ptTask: PTTask }>(
        `/api/v1/admin/physical-training/types/${typeId}/tasks/${taskId}`
    );
    return response.ptTask;
}

export async function createPTTask(typeId: string, payload: PTTaskCreate): Promise<PTTask> {
    const response = await api.post<{ ptTask: PTTask }, PTTaskCreate>(
        `/api/v1/admin/physical-training/types/${typeId}/tasks`,
        payload
    );
    return response.ptTask;
}

export async function updatePTTask(
    typeId: string,
    taskId: string,
    payload: PTTaskUpdate
): Promise<PTTask> {
    const response = await api.patch<{ ptTask: PTTask }, PTTaskUpdate>(
        `/api/v1/admin/physical-training/types/${typeId}/tasks/${taskId}`,
        payload
    );
    return response.ptTask;
}

export async function deletePTTask(
    typeId: string,
    taskId: string,
    options?: DeleteOptions
): Promise<void> {
    const endpoint = `/api/v1/admin/physical-training/types/${typeId}/tasks/${taskId}`;
    if (options) {
        await api.request({ method: "DELETE", endpoint, body: options });
    } else {
        await api.delete(endpoint);
    }
}

// ============================================================================
// PT TASK SCORES API
// ============================================================================

export async function listPTTaskScores(
    typeId: string,
    taskId: string
): Promise<{ items: PTTaskScore[]; count: number }> {
    return await api.get<{ items: PTTaskScore[]; count: number }>(
        `/api/v1/admin/physical-training/types/${typeId}/tasks/${taskId}/scores`
    );
}

export async function getPTTaskScoreById(
    typeId: string,
    taskId: string,
    scoreId: string
): Promise<PTTaskScore> {
    const response = await api.get<{ ptTaskScore: PTTaskScore }>(
        `/api/v1/admin/physical-training/types/${typeId}/tasks/${taskId}/scores/${scoreId}`
    );
    return response.ptTaskScore;
}

export async function createPTTaskScore(
    typeId: string,
    taskId: string,
    payload: PTTaskScoreCreate
): Promise<PTTaskScore> {
    const response = await api.post<{ ptTaskScore: PTTaskScore }, PTTaskScoreCreate>(
        `/api/v1/admin/physical-training/types/${typeId}/tasks/${taskId}/scores`,
        payload
    );
    return response.ptTaskScore;
}

export async function updatePTTaskScore(
    typeId: string,
    taskId: string,
    scoreId: string,
    payload: PTTaskScoreUpdate
): Promise<PTTaskScore> {
    const response = await api.patch<{ ptTaskScore: PTTaskScore }, PTTaskScoreUpdate>(
        `/api/v1/admin/physical-training/types/${typeId}/tasks/${taskId}/scores/${scoreId}`,
        payload
    );
    return response.ptTaskScore;
}

export async function deletePTTaskScore(
    typeId: string,
    taskId: string,
    scoreId: string
): Promise<void> {
    await api.delete(
        `/api/v1/admin/physical-training/types/${typeId}/tasks/${taskId}/scores/${scoreId}`
    );
}

// ============================================================================
// MOTIVATION FIELDS API
// ============================================================================

export async function listPTMotivationFields(
    courseIdOrSemester: string | number,
    maybeSemester?: number,
): Promise<{ items: PTMotivationField[]; count: number }> {
    const courseId = typeof courseIdOrSemester === "string" ? courseIdOrSemester : undefined;
    const semester = typeof courseIdOrSemester === "number" ? courseIdOrSemester : (maybeSemester as number);
    return await api.get<{ items: PTMotivationField[]; count: number }>(
        `/api/v1/admin/physical-training/motivation-fields`,
        { query: { ...(courseId ? { courseId } : {}), semester } }
    );
}

export async function getPTMotivationFieldById(fieldId: string): Promise<PTMotivationField> {
    const response = await api.get<{ motivationField: PTMotivationField }>(
        `/api/v1/admin/physical-training/motivation-fields/${fieldId}`
    );
    return response.motivationField;
}

export async function createPTMotivationField(
    payload: PTMotivationFieldCreate
): Promise<PTMotivationField> {
    const response = await api.post<{ motivationField: PTMotivationField }, PTMotivationFieldCreate>(
        `/api/v1/admin/physical-training/motivation-fields`,
        payload
    );
    return response.motivationField;
}

export async function updatePTMotivationField(
    fieldId: string,
    payload: PTMotivationFieldUpdate
): Promise<PTMotivationField> {
    const response = await api.patch<
        { motivationField: PTMotivationField },
        PTMotivationFieldUpdate
    >(`/api/v1/admin/physical-training/motivation-fields/${fieldId}`, payload);
    return response.motivationField;
}

export async function deletePTMotivationField(
    fieldId: string,
    options?: DeleteOptions
): Promise<void> {
    const endpoint = `/api/v1/admin/physical-training/motivation-fields/${fieldId}`;
    if (options) {
        await api.request({ method: "DELETE", endpoint, body: options });
    } else {
        await api.delete(endpoint);
    }
}
