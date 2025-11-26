import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import {
    createOcAchievement,
    deleteOcAchievement,
    listOcAchievements,
    updateOcAchievement,
} from "@/app/lib/api/achievementApi";
import { FormValues } from "@/types/club-detls";

export const useAchievementActions = (selectedCadet: any) => {
    const { getValues, setValue } = useFormContext<FormValues>();

    const submitAchievements = async () => {
        const rows = getValues().achievements;

        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return;
        }

        try {
            for (let i = 0; i < rows.length; i++) {
                const { id, achievement } = rows[i];
                const trimmed = (achievement ?? "").trim();

                if (!trimmed && id) {
                    await deleteOcAchievement(selectedCadet.ocId, id);
                    // clear id locally
                    setValue(`achievements.${i}.id`, null);
                    continue;
                }

                if (!trimmed && !id) {
                    // nothing to create
                    continue;
                }

                if (id)
                    await updateOcAchievement(selectedCadet.ocId, id, { achievement: trimmed });
                else {
                    const created = await createOcAchievement(selectedCadet.ocId, { achievement: trimmed });
                    setValue(`achievements.${i}.id`, created.id);
                }
            }

            toast.success("Achievements saved!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to save achievements");
        }
    };

    const fetchAchievements = async () => {
        if (!selectedCadet?.ocId) return [];
        const res = await listOcAchievements(selectedCadet.ocId);
        return res.items ?? [];
    };

    const deleteAchievement = async (index: number, remove: (index: number) => void) => {
        const rows = getValues().achievements;
        const row = rows?.[index];
        if (!row) {
            return;
        }

        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return;
        }

        const { id } = row;

        if (!id) {
            remove(index);
            toast.success("Achievement removed");
            return;
        }

        try {
            await deleteOcAchievement(selectedCadet.ocId, id);
            remove(index);
            toast.success("Achievement deleted");
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete achievement");
        }
    };

    return { submitAchievements, fetchAchievements, deleteAchievement };

};
