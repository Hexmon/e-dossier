import { endpoints } from "@/constants/endpoints";
import { api } from "../apiClient";

export interface Course {
    id: string;
    code: string;
    title: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
}

export interface Subject {
    id: string;
    name: string;
    code: string;
    semester: number;
    branch?: string;
    description?: string;
    hasPractical?: boolean;
    hasTheory?: boolean;
    defaultPracticalCredits?: number;
    defaultTheoryCredits?: number;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

export interface CourseOffering {
    id: string;
    subjectId: string;
    semester: number;
    subject: Subject;
}

export interface OC {
    id: string;
    ocNo: string;
    name: string;
    courseId: string;
    branch?: string;
}

export interface ApiListResponse<T> {
    status: number;
    ok: boolean;
    message: string;
    items: T[];
    count: number;
}

export interface TheoryMarks {
    tutorial?: string;
    phaseTest1Marks?: number;
    phaseTest2Marks?: number;
    finalMarks?: number;
    sessionalMarks?: number;
    totalMarks?: number;
}

export interface PracticalMarks {
    finalMarks?: number;
    totalMarks?: number;
}

export interface SubjectRecord {
    offeringId: string;
    includeTheory: boolean;
    includePractical: boolean;
    subject: Subject;
    theory?: TheoryMarks;
    practical?: PracticalMarks;
    theoryCredits?: number;
    practicalCredits?: number;
}

export interface SemesterRecord {
    semester: number;
    branchTag: string;
    sgpa?: number;
    cgpa?: number;
    marksScored?: number;
    subjects: SubjectRecord[];
    createdAt: string;
    updatedAt: string;
}

export interface OCRecord {
    ocId: string;
    status: string;
    data: SemesterRecord[];
}

export interface BulkAcademicGetResponse {
    status: number;
    ok: boolean;
    message: string;
    items: OCRecord[];
    count: number;
    successCount: number;
    errorCount: number;
}

export interface AcademicRecord {
    ocId: string;
    semester: number;
    subjectId: string;
    theory?: TheoryMarks;
    practical?: PracticalMarks;
}

export interface BulkAcademicItem {
    op: "upsert";
    ocId: string;
    semester: number;
    subjectId: string;
    theory?: TheoryMarks;
    practical?: PracticalMarks;
}

export interface BulkAcademicRequest {
    items: BulkAcademicItem[];
    failFast: boolean;
}

export interface BulkAcademicResponse {
    status: number;
    ok: boolean;
    message: string;
}

export const academicsApi = {
    // Get all courses
    getCourses: async (): Promise<ApiListResponse<Course>> => {
        return api.get<ApiListResponse<Course>>(endpoints.course.all);
    },

    // Get course offerings (subjects) for a specific course and semester
    getCourseOfferings: async (
        courseId: string,
        semester: number
    ): Promise<ApiListResponse<CourseOffering>> => {
        return api.get<ApiListResponse<CourseOffering>>(
            endpoints.admin.courseOfferings(courseId),
            { query: { semester } }
        );
    },

    // Get all OCs
    getAllOCs: async (): Promise<ApiListResponse<OC>> => {
        return api.get<ApiListResponse<OC>>(endpoints.oc.list);
    },

    // Get bulk academic records
    getBulkAcademics: async (
        ocIds: string[]
    ): Promise<BulkAcademicGetResponse> => {
        return api.get<BulkAcademicGetResponse>(
            `${endpoints.oc.list}/academics/bulk`,
            { query: { ocIds: ocIds.join(",") } }
        );
    },

    // Save bulk academic records
    saveBulkAcademics: async (
        request: BulkAcademicRequest
    ): Promise<BulkAcademicResponse> => {
        return api.post<BulkAcademicResponse, BulkAcademicRequest>(
            `${endpoints.oc.list}/academics/bulk`,
            request
        );
    },
};
