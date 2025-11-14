// src/app/lib/api/ocPersonalApi.ts
import { api } from "@/app/lib/apiClient";
import { baseURL, endpoints } from "@/constants/endpoints";

// Type for one personal record (you can expand based on your schema)
export interface OCPersonalRecord {
    id?: string;
    ocId: string;
    pl?: string;
    pi?: string;
    pob?: string;
    placeOfBirth?: string;
    no?: string;
    name?: string;
    course?: string;
    doa?: string;
    dob?: string;
    idenMarks?: string;
    idenMarks2?: string;
    nationality?: string;
    bloodGp?: string;
    bloodGroup?: string;
    religion?: string;
    domicile?: string;
    fatherName?: string;
    fatherMobile?: string;
    fatherAddressPermt?: string;
    fatherAddressPresent?: string;
    fatherProfession?: string;
    guardianName?: string;
    guardianAddress?: string;
    income?: string;
    nokDetails?: string;
    nokAddressPermanent?: string;
    nokAddressPresent?: string;
    nearestRlyStn?: string;
    familySecunderabad?: string;
    armedForcesRelative?: string;
    govtAssistance?: string;
    mobile?: string;
    email?: string;
    passport?: string;
    pan?: string;
    aadhaar?: string;
    bank?: string;
    idCard?: string;
    upsc?: string;
    ssb?: string;
    games?: string;
    hobbies?: string;
    swimmer?: boolean;
    languages?: string;

    dsPiSsicNo?: string;
    dsPiRank?: string;
    dsPiName?: string;
    dsPiUnitArm?: string;
    dsPiMobile?: string;

    dsDyIcNo?: string;
    dsDyRank?: string;
    dsDyName?: string;
    dsDyUnitArm?: string;
    dsDyMobile?: string;

    dsCdrIcNo?: string;
    dsCdrRank?: string;
    dsCdrName?: string;
    dsCdrUnitArm?: string;
    dsCdrMobile?: string;

    createdAt?: string;
    updatedAt?: string;
}


// Fetch personal particulars for one OC
export async function getOCPersonal(ocId: string) {
    const res = await api.get<{ data: OCPersonalRecord }>(
        endpoints.oc.personal(ocId)
    );

    return res.data ?? null;
}

// Create or update (POST) OC personal particulars
export async function createOCPersonal(
    ocId: string,
    body: Omit<OCPersonalRecord, "id" | "ocId" | "createdAt" | "updatedAt">
): Promise<OCPersonalRecord> {
    const response = await api.post<{ personal: OCPersonalRecord }>(
        endpoints.oc.personal(ocId),
        body,
        { baseURL }
    );

    if ("personal" in response) return response.personal;
    return response as unknown as OCPersonalRecord;
}

// Update (PATCH) personal particulars for one OC
export async function updateOCPersonal(
    ocId: string,
    body: Partial<OCPersonalRecord> // Only include fields you want to update
): Promise<OCPersonalRecord> {
    const response = await api.patch<{ personal: OCPersonalRecord }>(
        `${baseURL}/api/v1/oc/${ocId}/personal`,
        body
    );

    if ("personal" in response) return response.personal;
    return response as unknown as OCPersonalRecord;
}
