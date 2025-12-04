// /hooks/useFamily.ts
"use client";

import { useCallback, useState } from "react";
import {
    getFamilyDetails,
    saveFamilyDetails,
    updateFamilyMember,
    deleteFamilyMember,
    FamilyMemberRecord,
    FamilyMember
} from "@/app/lib/api/familyApi";

export function useFamily(ocId: string) {
    const [family, setFamily] = useState<FamilyMemberRecord[]>([]);

    // -------------------------
    // FETCH FAMILY
    // -------------------------
    const fetchFamily = useCallback(async () => {
        if (!ocId) return;

        const data = await getFamilyDetails(ocId);
        setFamily(Array.isArray(data) ? data : []);
    }, [ocId]);

    // -------------------------
    // SAVE NEW FAMILY ARRAY
    // -------------------------
    const saveFamily = useCallback(
        async (members: FamilyMember[]) => {
            if (!ocId) return null;
            return await saveFamilyDetails(ocId, members);
        },
        [ocId]
    );

    // -------------------------
    // UPDATE SINGLE MEMBER
    // -------------------------
    const updateMember = useCallback(
        async (id: string, payload: FamilyMemberRecord) => {
            if (!ocId) return null;
            return await updateFamilyMember(ocId, id, payload);
        },
        [ocId]
    );

    // -------------------------
    // DELETE SINGLE MEMBER
    // -------------------------
    const removeMember = useCallback(
        async (id: string) => {
            if (!ocId) return null;
            return await deleteFamilyMember(ocId, id);
        },
        [ocId]
    );

    return {
        family,
        setFamily,
        fetchFamily,
        saveFamily,
        updateMember,
        removeMember,
    };
}
