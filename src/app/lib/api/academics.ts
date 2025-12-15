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
    sgpa?: number;
    cgpa?: number;
    marksScored?: number;
}

export interface ListSemestersParams {
    semester?: number;
}

export async function listSemesters(
    ocId: string,
    params?: ListSemestersParams
): Promise<{ semesters: SemesterData[] }> {
    const response = await api.get<{ semesters: SemesterData[] }>(
        endpoints.oc.academics.list(ocId),
        {
            query: params as Record<string, string | number | undefined>,
        }
    );
    return { semesters: response.semesters || [] };
}

export async function getSemesterById(
    ocId: string,
    semester: number
): Promise<SemesterData> {
    const response = await api.get<SemesterData>(
        endpoints.oc.academics.getBySemester(ocId, semester)
    );
    return response;
}

export async function updateSemesterGPA(
    ocId: string,
    semester: number,
    payload: SemesterGPAUpdate
): Promise<SemesterData> {
    const response = await api.patch<SemesterData, SemesterGPAUpdate>(
        endpoints.oc.academics.updateSemester(ocId, semester),
        payload
    );
    return response;
}

export async function deleteSemester(
    ocId: string,
    semester: number
): Promise<{ message: string }> {
    return await api.delete(
        endpoints.oc.academics.deleteSemester(ocId, semester)
    );
}

export async function updateSubjectMarks(
    ocId: string,
    semester: number,
    subjectId: string,
    payload: SubjectMarks
): Promise<SubjectWithMarks> {
    const response = await api.patch<SubjectWithMarks, SubjectMarks>(
        endpoints.oc.academics.updateSubject(ocId, semester, subjectId),
        payload
    );
    return response;
}

export async function deleteSubject(
    ocId: string,
    semester: number,
    subjectId: string
): Promise<{ message: string }> {
    return await api.delete(
        endpoints.oc.academics.deleteSubject(ocId, semester, subjectId)
    );
}