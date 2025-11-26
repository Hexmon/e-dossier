import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { listOcDrill, updateOcDrill, createOcDrill } from "@/app/lib/api/drillApi";
import { romanToNumber } from "@/constants/app.constants";
import { FormValues } from "@/types/club-detls";
import { calculateDrillTotals } from "@/utils/drillTotals";

export const useDrillActions = (selectedCadet: any) => {
    const { getValues, setValue } = useFormContext<FormValues>();

    const submitDrill = async () => {
        try {
            const values = getValues();
            const totals = calculateDrillTotals(values.drillRows);

            const rows = [...values.drillRows];
            // store totals into index 3 (as your original logic did)
            rows[3] = { ...rows[3], ...totals };

            for (let i = 0; i < 3; i++) {
                const { id, semester, maxMks, m1, m2, a1c1, a2c2, remarks } = rows[i];

                const payload = {
                    semester: romanToNumber[semester],
                    maxMarks: Number(maxMks ?? 0),
                    m1Marks: Number(m1 ?? 0),
                    m2Marks: Number(m2 ?? 0),
                    a1c1Marks: Number(a1c1 ?? 0),
                    a2c2Marks: Number(a2c2 ?? 0),
                    remark: (remarks ?? "").trim(),
                };

                if (id)
                    await updateOcDrill(selectedCadet.ocId, id, payload);
                else {
                    const created = await createOcDrill(selectedCadet.ocId, payload);
                    setValue(`drillRows.${i}.id`, created.id);
                }
            }

            toast.success("Drill saved successfully");
        } catch (err) {
            console.error(err);
            toast.error("Failed saving drill values");
        }
    };

    const fetchDrill = async () => {
        if (!selectedCadet?.ocId) return [];
        const res = await listOcDrill(selectedCadet.ocId, 50, 0);
        return res?.items ?? [];
    };

    return { submitDrill, fetchDrill };
};
