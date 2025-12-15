import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";

export interface Instructor {
    id?: string;
    name: string;
    email: string;
    phone: string;
    affiliation: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

export interface InstructorCreate {
    name: string;
    email: string;
    phone: string;
    affiliation: string;
    notes?: string;
}

export interface InstructorUpdate {
    name?: string;
    email?: string;
    phone?: string;
    affiliation?: string;
    notes?: string;
}

export interface ListInstructorsParams {
    q?: string;
    includeDeleted?: boolean;
    limit?: number;
    offset?: number;
    [key: string]: string | number | boolean | undefined;
}

export async function listInstructors(
    params?: ListInstructorsParams
): Promise<{ instructors: Instructor[] }> {
    const response = await api.get<{ items: Instructor[]; count: number }>(
        endpoints.admin.instructors,
        {
            query: params as Record<string, string | number | boolean | undefined>,
        }
    );
    return { instructors: response.items || [] };
}

export async function getInstructorById(instructorId: string): Promise<Instructor> {
    const res = await api.get<{ instructor: Instructor }>(
        endpoints.admin.instructorById(instructorId)
    );
    return res.instructor;
}

export async function createInstructor(
    payload: InstructorCreate
): Promise<Instructor> {
    const res = await api.post<{ instructor: Instructor }, InstructorCreate>(
        endpoints.admin.instructors,
        payload
    );
    return res.instructor;
}

export async function updateInstructor(
    instructorId: string,
    payload: InstructorUpdate
): Promise<Instructor> {
    const res = await api.patch<{ instructor: Instructor }, InstructorUpdate>(
        endpoints.admin.instructorById(instructorId),
        payload
    );
    return res.instructor;
}

export async function deleteInstructor(
    instructorId: string
): Promise<{ id: string; message: string }> {
    return await api.delete(endpoints.admin.instructorById(instructorId));
}