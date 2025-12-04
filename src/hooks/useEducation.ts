"use client";

import { useCallback, useState } from "react";
import {
    getEducationDetails,
    saveEducationDetails,
    updateEducationRecord,
    deleteEducationRecord,
    EducationItem,
    EducationRecordResponse,
} from "@/app/lib/api/educationApi";

export function useEducation(ocId: string) {
    const [education, setEducation] = useState<EducationItem[]>([]);

    // --------------------------
    // FETCH LIST
    // --------------------------
    const fetchEducation = useCallback(async () => {
        if (!ocId) return;

        const data = await getEducationDetails(ocId);

        if (Array.isArray(data)) {
            const formatted = data.map((item: EducationRecordResponse) => ({
                id: item.id,
                qualification: item.level || "",
                school: item.schoolOrCollege || "",
                subs: item.subjects || "",
                board: item.boardOrUniv || "",
                marks: item.totalPercent ? item.totalPercent.toString() : "",
                grade: "",
            }));

            setEducation(formatted);
        }
    }, [ocId]);

    // --------------------------
    // SAVE NEW LIST
    // --------------------------
    const saveEducation = useCallback(
        async (payload: any[]) => {
            if (!ocId) return null;
            return await saveEducationDetails(ocId, payload);
        },
        [ocId]
    );

    // --------------------------
    // UPDATE ONE ROW
    // --------------------------
    const updateEducation = useCallback(
        async (id: string, partial: any) => {
            if (!ocId) return null;
            return await updateEducationRecord(ocId, id, partial);
        },
        [ocId]
    );

    // --------------------------
    // DELETE ONE ROW
    // --------------------------
    const deleteEducation = useCallback(
        async (id: string) => {
            if (!ocId) return null;
            return await deleteEducationRecord(ocId, id);
        },
        [ocId]
    );

    return {
        education,
        setEducation,
        fetchEducation,
        saveEducation,
        updateEducation,
        deleteEducation,
    };
}
