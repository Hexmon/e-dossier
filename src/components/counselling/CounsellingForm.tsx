"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CounsellingFormData } from "@/types/counselling";
import { CounsellingRecordFormData, saveCounsellingForm } from "@/store/slices/counsellingRecordsSlice";

interface Props {
    onSubmit: (data: CounsellingFormData) => Promise<void> | void;
    semLabel: string;
    ocId: string;
    savedFormData?: CounsellingRecordFormData[];
    onClearForm: () => void;
}

export default function CounsellingForm({
    onSubmit,
    semLabel,
    ocId,
    savedFormData,
    onClearForm
}: Props) {
    const dispatch = useDispatch();

    // Initialize with saved data or defaults
    const getDefaultValues = (): CounsellingFormData => {
        if (savedFormData && savedFormData.length > 0) {
            return { records: savedFormData };
        }
        return {
            records: [
                {
                    term: semLabel ?? "",
                    reason: "",
                    warningType: "",
                    date: "",
                    warningBy: "",
                },
            ],
        };
    };

    const form = useForm<CounsellingFormData>({
        defaultValues: getDefaultValues(),
    });

    const { control, handleSubmit, register, reset, setValue, watch } = form;
    const { fields, append, remove } = useFieldArray({ control, name: "records" });

    // Auto-save to Redux on form changes
    useEffect(() => {
        const subscription = watch((value) => {
            if (ocId && value.records && value.records.length > 0) {
                const formData = value.records.map(record => ({
                    term: record?.term || semLabel || "",
                    reason: record?.reason || "",
                    warningType: record?.warningType || "",
                    date: record?.date || "",
                    warningBy: record?.warningBy || "",
                }));

                dispatch(saveCounsellingForm({ ocId, data: formData }));
            }
        });
        return () => subscription.unsubscribe();
    }, [watch, dispatch, ocId, semLabel]);

    // keep term in sync with semLabel for new rows
    useEffect(() => {
        // update existing rows' term
        for (let i = 0; i < fields.length; i += 1) {
            setValue(`records.${i}.term`, semLabel ?? "", { shouldDirty: true });
        }
    }, [semLabel, fields.length, setValue]);

    const addRow = () =>
        append({
            term: semLabel ?? "",
            reason: "",
            warningType: "",
            date: "",
            warningBy: "",
        });

    const handleFormReset = () => {
        reset({
            records: [
                {
                    term: semLabel ?? "",
                    reason: "",
                    warningType: "",
                    date: "",
                    warningBy: "",
                },
            ],
        });
        onClearForm();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="overflow-x-auto border rounded-lg shadow mb-4">
                <table className="w-full border text-sm">
                    <thead className="bg-muted/70">
                        <tr>
                            <th className="p-2 border text-center">S No</th>
                            <th className="p-2 border">Reason (Attach copy)</th>
                            <th className="p-2 border">Nature of Warning</th>
                            <th className="p-2 border">Date</th>
                            <th className="p-2 border">Warning by (Rk & Name)</th>
                            <th className="p-2 border text-center">Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {fields.map((field, idx) => {
                            return (
                                <tr key={field.id}>
                                    <td className="p-2 border text-center">
                                        <Input
                                            value={String(idx + 1)}
                                            disabled
                                            className="bg-muted/70 text-center"
                                        />
                                    </td>

                                    <td className="p-2 border">
                                        <Input {...register(`records.${idx}.reason`)} />
                                    </td>

                                    <td className="p-2 border">
                                        <Input {...register(`records.${idx}.warningType`)} />
                                    </td>

                                    <td className="p-2 border">
                                        <Input type="date" {...register(`records.${idx}.date`)} />
                                    </td>

                                    <td className="p-2 border">
                                        <Input {...register(`records.${idx}.warningBy`)} />
                                    </td>

                                    <td className="p-2 border text-center">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => remove(idx)}
                                        >
                                            Remove
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex justify-center gap-4">
                <Button type="button" onClick={addRow}>
                    + Add Row
                </Button>

                <Button type="submit" className="bg-success hover:bg-success/90">
                    Submit
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    onClick={handleFormReset}
                >
                    Clear Form
                </Button>
            </div>

            {/* Auto-save indicator */}
            <p className="text-sm text-muted-foreground text-center mt-2">
                * Changes are automatically saved
            </p>
        </form>
    );
}