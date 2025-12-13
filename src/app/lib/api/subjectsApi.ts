import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";

export interface Subject {
    id?: string;
    code: string;
    name: string;
    branch: string;
    hasTheory: boolean;
    hasPractical: boolean;
    defaultTheoryCredits: number;
    defaultPracticalCredits: number;
    description?: string;
}

export interface SubjectCreate {
    code: string;
    name: string;
    branch: string;
    hasTheory: boolean;
    hasPractical: boolean;
    defaultTheoryCredits: number;
    defaultPracticalCredits: number;
    description?: string;
}

export interface SubjectUpdate {
    code?: string;
    name?: string;
    branch?: string;
    hasTheory?: boolean;
    hasPractical?: boolean;
    defaultTheoryCredits?: number;
    defaultPracticalCredits?: number;
    description?: string;
}

export interface ListSubjectsParams {
    q?: string;
    branch?: string;
    includeDeleted?: boolean;
    limit?: number;
    offset?: number;
    [key: string]: string | number | boolean | undefined;
}

export async function listSubjects(
    params?: ListSubjectsParams
): Promise<{ subjects: Subject[] }> {
    const response = await api.get<{ items: Subject[]; count: number }>(
        endpoints.admin.subjects,
        {
            query: params as Record<string, string | number | boolean | undefined>,
        }
    );
    return { subjects: response.items || [] };
}

export async function getSubjectById(subjectId: string): Promise<Subject> {
    const res = await api.get<{ subject: Subject }>(
        endpoints.admin.subjectById(subjectId)
    );
    return res.subject;
}

export async function createSubject(
    payload: SubjectCreate
): Promise<Subject> {
    const res = await api.post<{ subject: Subject }, SubjectCreate>(
        endpoints.admin.subjects,
        payload
    );
    return res.subject;
}

export async function updateSubject(
    subjectId: string,
    payload: SubjectUpdate
): Promise<Subject> {
    const res = await api.patch<{ subject: Subject }, SubjectUpdate>(
        endpoints.admin.subjectById(subjectId),
        payload
    );
    return res.subject;
}

export async function deleteSubject(
    subjectId: string
): Promise<{ id: string; message: string }> {
    return await api.delete(endpoints.admin.subjectById(subjectId));
}