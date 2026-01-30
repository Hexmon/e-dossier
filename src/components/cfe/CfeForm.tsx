"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { catOptions } from "@/constants/app.constants";

import type { cfeFormData, cfeRow } from "@/types/cfe";
import { saveCfeForm } from "@/store/slices/cfeRecordsSlice";

interface Props {
    onSubmit: (data: cfeFormData) => Promise<void> | void;
    semIndex: number;
    existingRows: cfeRow[];
    loading?: boolean;
    ocId: string; // Add ocId prop
    defaultValues: cfeFormData; // Add defaultValues prop
    onClear: () => void; // Add onClear prop
}

export default function CfeForm({
    onSubmit,
    semIndex,
    existingRows,
    loading = false,
    ocId,
    defaultValues,
    onClear
}: Props) {
    const dispatch = useDispatch();

    const form = useForm<cfeFormData>({
        defaultValues,
    });

    const { control, handleSubmit, register, reset, setValue, watch } = form;
    const { fields, append, remove } = useFieldArray({ control, name: "records" });

    // Auto-save to Redux on form changes
    useEffect(() => {
        const subscription = watch((value) => {
            if (ocId && value.records && value.records.length > 0) {
                const formData = value.records.map(record => ({
                    serialNo: record?.serialNo || "",
                    cat: record?.cat || "",
                    mks: record?.mks || "",
                    remarks: record?.remarks || "",
                    sub_category: record?.sub_category || "",
                }));

                dispatch(saveCfeForm({ ocId, data: formData }));
            }
        });
        return () => subscription.unsubscribe();
    }, [watch, dispatch, ocId]);

    const addRow = () =>
        append({
            serialNo: String(fields.length + 1),
            cat: "",
            mks: "",
            remarks: "",
            sub_category: "", // Added sub_category to default values
        });

    const handleFormSubmit = async (data: cfeFormData) => {
        // Filter out empty rows
        const filledRows = data.records.filter(row => {
            const hasData =
                (row.cat && row.cat.trim() !== "") ||
                (row.mks && row.mks.trim() !== "") ||
                (row.remarks && row.remarks.trim() !== "");
            return hasData;
        });

        if (filledRows.length === 0) {
            alert("Please fill in at least one CFE record with data");
            return;
        }

        // Validate that filled rows have required fields
        const invalidRows = filledRows.filter(row =>
            !row.cat || row.cat.trim() === "" ||
            !row.mks || row.mks.trim() === ""
        );

        if (invalidRows.length > 0) {
            alert("Category and Marks are required for all records");
            return;
        }

        await onSubmit({ records: filledRows });
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)}>
            <div className="overflow-x-auto border rounded-lg shadow">
                <table className="w-full border text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border">S No</th>
                            <th className="p-2 border">Cat</th>
                            <th className="p-2 border">Sub Category</th>
                            <th className="p-2 border">Mks</th>
                            <th className="p-2 border">Remarks</th>
                            <th className="p-2 border text-center">Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {fields.map((field, idx) => {
                            return (
                                <tr key={field.id}>
                                    <td className="p-2 border text-center">
                                        <Input value={String(idx + 1)} disabled className="bg-gray-100 text-center" />
                                    </td>

                                    <td className="p-2 border">
                                        <Select
                                            value={watch(`records.${idx}.cat`) ?? ""}
                                            onValueChange={(v) =>
                                                setValue(`records.${idx}.cat`, v, { shouldDirty: true, shouldValidate: true })
                                            }
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select category..." />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-72">
                                                {catOptions.map((opt) => (
                                                    <SelectItem key={opt} value={opt}>
                                                        {opt}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </td>

                                    <td className="p-2 border">
                                        <Input {...register(`records.${idx}.sub_category` as const)} type="text" />
                                    </td>

                                    <td className="p-2 border">
                                        <Input {...register(`records.${idx}.mks` as const)} type="text" />
                                    </td>

                                    <td className="p-2 border">
                                        <Input {...register(`records.${idx}.remarks` as const)} type="text" />
                                    </td>

                                    <td className="p-2 border text-center">
                                        <Button type="button" variant="destructive" size="sm" onClick={() => remove(idx)} disabled={loading}>
                                            Remove
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex justify-center gap-3">
                <Button type="button" onClick={addRow} disabled={loading}>
                    + Add Row
                </Button>

                <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={loading}>
                    {loading ? "Submitting..." : "Submit"}
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    onClick={onClear}
                    disabled={loading}
                    className="hover:bg-destructive hover:text-white"
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