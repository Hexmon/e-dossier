import { useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { createOcClub, updateOcClub, getOcClubs } from "@/app/lib/api/clubApi";
import { romanToNumber } from "@/constants/app.constants";
import { FormValues } from "@/types/club-detls";

export const useClubActions = (selectedCadet: any) => {
    const { getValues, setValue } = useFormContext<FormValues>();

    const submitClub = useCallback(async () => {
        try {
            const { clubRows } = getValues();
            if (!selectedCadet?.ocId) throw new Error("No cadet selected");

            for (let i = 0; i < clubRows.length; i++) {
                const { id, semester, clubName, splAchievement, remarks } = clubRows[i];

                const trimmedClub = (clubName ?? "").trim();
                const trimmedAchievement = (splAchievement ?? "").trim();
                const trimmedRemarks = (remarks ?? "").trim();

                const isNew = !id;
                const isEmpty =
                    trimmedClub === "" &&
                    trimmedAchievement === "" &&
                    trimmedRemarks === "";

                if (isNew && isEmpty) {
                    continue;
                }

                const payload = {
                    semester: romanToNumber[semester],
                    clubName: trimmedClub,
                    specialAchievement: trimmedAchievement,
                    remark: trimmedRemarks,
                };

                if (id) {
                    await updateOcClub(selectedCadet.ocId, id, payload);
                } else {
                    const created = await createOcClub(selectedCadet.ocId, payload);
                    setValue(`clubRows.${i}.id`, created.id);
                }
            }

            toast.success("Club details saved!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to save club details");
        }
    }, [selectedCadet?.ocId, getValues, setValue]);

    const fetchClub = useCallback(async () => {
        if (!selectedCadet?.ocId) return [];
        const res: any = await getOcClubs(selectedCadet.ocId);
        return res?.items ?? res ?? [];
    }, [selectedCadet?.ocId]);

    return { submitClub, fetchClub };
};