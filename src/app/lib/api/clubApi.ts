// src/app/api/oc/clubs.ts
import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";

export interface CreateClubBody {
    semester: number;
    clubName: string;
    specialAchievement: string;
    remark: string;
}

export interface CreateClubResponse {
    id: string;
    semester: number;
    clubName: string;
    specialAchievement: string;
    remark: string;
}

type DataResponse<T> = {
    message?: string;
    data: T;
};

type ListResponse<T> = {
    message?: string;
    items: T[];
    count: number;
};

export async function createOcClub(ocId: string, body: CreateClubBody) {
    const res = await api.post<DataResponse<CreateClubResponse>, CreateClubBody>(
        endpoints.oc.clubDetls(ocId),
        body
    );
    return res.data;
}

export async function getOcClubs(ocId: string) {
    return api.get<ListResponse<CreateClubResponse>>(
        endpoints.oc.clubDetls(ocId)
    );
}

export async function updateOcClub(
    ocId: string,
    clubDtlId: string,
    body: CreateClubBody
) {
    const res = await api.patch<DataResponse<CreateClubResponse>, CreateClubBody>(
        endpoints.oc.clubDetlsById(ocId, clubDtlId),
        body
    );
    return res.data;
}
