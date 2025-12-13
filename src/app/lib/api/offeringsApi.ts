import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";

export interface OfferingInstructor {
    instructorId: string;
    role: "PRIMARY" | "ASSISTANT";
    instructorName?: string;
    instructorEmail?: string;
}

export interface Offering {
    id?: string;
    courseId: string;
    subjectId: string;
    semester: number;
    includeTheory: boolean;
    includePractical: boolean;
    theoryCredits: number;
    practicalCredits: number | null;
    instructors: OfferingInstructor[];
    subjectCode?: string;
    subjectName?: string;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

export interface OfferingCreate {
    subjectId: string;
    semester: number;
    includeTheory: boolean;
    includePractical: boolean;
    theoryCredits: number;
    practicalCredits: number | null;
    instructors: OfferingInstructor[];
}

export interface OfferingUpdate {
    subjectId?: string;
    semester?: number;
    includeTheory?: boolean;
    includePractical?: boolean;
    theoryCredits?: number;
    practicalCredits?: number | null;
    instructors?: OfferingInstructor[];
}

export interface ListOfferingsParams {
    semester?: number;
    includeDeleted?: boolean;
    limit?: number;
    offset?: number;
    [key: string]: string | number | boolean | undefined;
}

interface BackendOfferingResponse {
    id: string;
    semester: number;
    includeTheory: boolean;
    includePractical: boolean;
    theoryCredits: number;
    practicalCredits: number | null;
    subject?: {
        id: string;
        code: string;
        name: string;
        branch: string;
        hasTheory: boolean;
        hasPractical: boolean;
        defaultTheoryCredits: number;
        defaultPracticalCredits: number;
        description?: string;
        createdAt?: string;
        updatedAt?: string;
        deletedAt?: string | null;
    };
    instructors?: OfferingInstructor[];
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

function mapBackendOfferingToOffering(
    backendOffering: BackendOfferingResponse,
    courseId: string
): Offering {
    const {
        id = "",
        semester = 1,
        includeTheory = false,
        includePractical = false,
        theoryCredits = 0,
        practicalCredits = null,
        subject,
        instructors = [],
        createdAt,
        updatedAt,
        deletedAt,
    } = backendOffering;

    return {
        id,
        courseId,
        subjectId: subject?.id || "",
        semester,
        includeTheory,
        includePractical,
        theoryCredits,
        practicalCredits,
        instructors,
        subjectCode: subject?.code || "",
        subjectName: subject?.name || "",
        createdAt,
        updatedAt,
        deletedAt,
    };
}

export async function listOfferings(
    courseId: string,
    params?: ListOfferingsParams
): Promise<{ offerings: Offering[] }> {
    const response = await api.get<{ items: BackendOfferingResponse[]; count: number }>(
        endpoints.admin.courseOfferings(courseId),
        {
            query: params as Record<string, string | number | boolean | undefined>,
        }
    );

    const mappedOfferings = (response.items || []).map((item) =>
        mapBackendOfferingToOffering(item, courseId)
    );

    return { offerings: mappedOfferings };
}

export async function getOfferingById(
    courseId: string,
    offeringId: string
): Promise<Offering> {
    const res = await api.get<{ offering: BackendOfferingResponse }>(
        endpoints.admin.courseOfferingById(courseId, offeringId)
    );
    return mapBackendOfferingToOffering(res.offering, courseId);
}

export async function createOffering(
    courseId: string,
    payload: OfferingCreate
): Promise<Offering> {
    const res = await api.post<{ offering: BackendOfferingResponse }, OfferingCreate>(
        endpoints.admin.courseOfferings(courseId),
        payload
    );
    return mapBackendOfferingToOffering(res.offering, courseId);
}

export async function updateOffering(
    courseId: string,
    offeringId: string,
    payload: OfferingUpdate
): Promise<Offering> {
    const res = await api.patch<{ offering: BackendOfferingResponse }, OfferingUpdate>(
        endpoints.admin.courseOfferingById(courseId, offeringId),
        payload
    );
    return mapBackendOfferingToOffering(res.offering, courseId);
}

export async function deleteOffering(
    courseId: string,
    offeringId: string
): Promise<{ id: string; message: string }> {
    return await api.delete(endpoints.admin.courseOfferingById(courseId, offeringId));
}