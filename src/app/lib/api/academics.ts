import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";

export interface TheoryMarks {
    grade?: string;
    tutorial?: string;
    finalMarks?: number;
    phaseTest1Marks?: number;
    phaseTest2Marks?: number;
    sessionalMarks?: number;
    totalMarks?: number;
}

export interface PracticalMarks {
    grade?: string;
    tutorial?: string;
    finalMarks?: number;
    totalMarks?: number;
}

export interface SubjectMarks {
    theory?: {
        phaseTest1Marks?: number;
        phaseTest2Marks?: number;
        tutorial?: string;
        finalMarks?: number;
        grade?: string;
    };
    practical?: {
        finalMarks?: number;
        grade?: string;
        tutorial?: string;
    };
}

export interface SubjectWithMarks {
    offeringId: string;
    includeTheory: boolean;
    includePractical: boolean;
    theoryCredits: number;
    practicalCredits: number;
    subject: {
        id: string;
        code: string;
        name: string;
        branch: string;
        hasTheory: boolean;
        hasPractical: boolean;
        defaultTheoryCredits: number;
        defaultPracticalCredits: number;
        description: string;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
    };
    theory?: TheoryMarks;
    practical?: PracticalMarks;
}

export interface SemesterData {
    semester: number;
    branchTag: string;
    sgpa?: number;
    cgpa?: number;
    marksScored?: number;
    subjects: SubjectWithMarks[];
    createdAt: string;
    updatedAt: string;
}

export interface SemesterGPAUpdate {
    marksScored?: number;
    sgpa?: number;
    cgpa?: number;
}

export interface ListSemestersParams {
    semester?: number;
}

export interface DeleteOptions {
    hard?: boolean;
}

export interface AcademicsListResponse {
    message: string;
    items: SemesterData[];
    count: number;
}

export interface AcademicsSemesterResponse {
    message: string;
    data: SemesterData;
}

export interface AcademicsSemesterDeleteResponse {
    message: string;
    semester: number;
    hardDeleted: boolean;
}

export interface AcademicsSubjectDeleteResponse {
    message: string;
    data: SemesterData;
}

export async function listSemesters(
    ocId: string,
    params?: ListSemestersParams
): Promise<AcademicsListResponse> {
    const response = await api.get<AcademicsListResponse>(
        endpoints.oc.academics.list(ocId),
        {
            query: params as Record<string, string | number | undefined>,
        }
    );
    return {
        message: response.message,
        items: response.items ?? [],
        count: response.count ?? 0,
    };
}

export async function getSemesterById(
    ocId: string,
    semester: number
): Promise<AcademicsSemesterResponse> {
    const response = await api.get<AcademicsSemesterResponse>(
        endpoints.oc.academics.getBySemester(ocId, semester)
    );
    return {
        message: response.message,
        data: response.data,
    };
}

export async function updateSemesterSummary(
    ocId: string,
    semester: number,
    payload: SemesterGPAUpdate
): Promise<AcademicsSemesterResponse> {
    const response = await api.patch<AcademicsSemesterResponse, SemesterGPAUpdate>(
        endpoints.oc.academics.updateSemester(ocId, semester),
        payload
    );
    return {
        message: response.message,
        data: response.data,
    };
}

export async function deleteSemester(
    ocId: string,
    semester: number,
    options?: DeleteOptions
): Promise<AcademicsSemesterDeleteResponse> {
    return await api.delete<AcademicsSemesterDeleteResponse>(
        endpoints.oc.academics.deleteSemester(ocId, semester),
        {
            query: options?.hard ? { hard: true } : undefined,
        }
    );
}

export async function updateSubjectMarks(
    ocId: string,
    semester: number,
    subjectId: string,
    payload: SubjectMarks
): Promise<AcademicsSemesterResponse> {
    const response = await api.patch<AcademicsSemesterResponse, SubjectMarks>(
        endpoints.oc.academics.updateSubject(ocId, semester, subjectId),
        payload
    );
    return {
        message: response.message,
        data: response.data,
    };
}

export async function deleteSubject(
    ocId: string,
    semester: number,
    subjectId: string,
    options?: DeleteOptions
): Promise<AcademicsSubjectDeleteResponse> {
    return await api.delete<AcademicsSubjectDeleteResponse>(
        endpoints.oc.academics.deleteSubject(ocId, semester, subjectId),
        {
            query: options?.hard ? { hard: true } : undefined,
        }
    );
}

// Backward-compatible alias
export const updateSemesterGPA = updateSemesterSummary;
