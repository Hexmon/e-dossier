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

export async function createOcClub(ocId: string, body: CreateClubBody) {
    return api.post<CreateClubResponse, CreateClubBody>(
        endpoints.oc.clubDetls(ocId),
        body
    );
}

export async function getOcClubs(ocId: string) {
    return api.get(
        endpoints.oc.clubDetls(ocId)
    );
}

export async function updateOcClub(
    ocId: string,
    clubDtlId: string,
    body: CreateClubBody
) {
    return api.patch(
        endpoints.oc.clubDetlsById(ocId, clubDtlId),
        body
    );
}
