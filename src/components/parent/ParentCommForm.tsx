"use client";

import React, { useEffect, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveParentCommForm } from "@/store/slices/parentCommSlice";

export type ParentCommFormRow = {
    serialNo?: string;
    letterNo?: string;
    date?: string;
    teleCorres?: string;
    briefContents?: string;
    sigPICdr?: string;
};

export type ParentCommFormData = {
    records: ParentCommFormRow[];
};

interface Props {
    onSubmit: (data: ParentCommFormData) => Promise<void> | void;
    defaultValues?: ParentCommFormData;
    ocId: string;
    onClear?: () => void;
}

export default function ParentCommForm({ onSubmit, defaultValues, ocId, onClear }: Props) {
    const dispatch = useDispatch();
    const lastSavedData = useRef<string>("");
    const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const form = useForm<ParentCommFormData>({
        defaultValues: defaultValues ?? {
            records: [
                { letterNo: "", date: "", teleCorres: "", briefContents: "", sigPICdr: "" },
            ],
        },
    });

    const { control, handleSubmit, register, reset, watch } = form;
    const { fields, append, remove } = useFieldArray({ control, name: "records" });

    useEffect(() => {
        if (defaultValues) {
            reset(defaultValues);
        }
    }, [defaultValues, reset]);

    // Auto-save to Redux on form changes with debounce
    useEffect(() => {
        const subscription = watch((value) => {
            if (!ocId || !value.records || value.records.length === 0) return;

            // Clear existing timeout
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            // Debounce the save operation
            saveTimeoutRef.current = setTimeout(() => {
                const formData = value.records!.map(record => ({
                    serialNo: record?.serialNo || "",
                    letterNo: record?.letterNo || "",
                    date: record?.date || "",
                    teleCorres: record?.teleCorres || "",
                    briefContents: record?.briefContents || "",
                    sigPICdr: record?.sigPICdr || "",
                }));

                // Compare stringified data to avoid unnecessary dispatches
                const currentData = JSON.stringify(formData);
                if (currentData !== lastSavedData.current) {
                    lastSavedData.current = currentData;
                    dispatch(saveParentCommForm({ ocId, data: formData }));
                }
            }, 500); // 500ms debounce delay
        });

        return () => {
            subscription.unsubscribe();
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [watch, dispatch, ocId]);

    // Update lastSavedData when defaultValues change
    useEffect(() => {
        if (defaultValues?.records) {
            lastSavedData.current = JSON.stringify(defaultValues.records);
        }
    }, [defaultValues]);

    // Handle reset/clear
    const handleReset = () => {
        if (onClear) {
            onClear();
        } else {
            reset({
                records: [
                    { letterNo: "", date: "", teleCorres: "", briefContents: "", sigPICdr: "" },
                ],
            });
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="overflow-x-auto border rounded-lg shadow">
                <table className="w-full border text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            {["S.No", "Letter No", "Date", "Tele/Corres", "Brief Contents", "Sig PI Cdr", "Action"].map((h) => (
                                <th key={h} className="p-2 border text-center">{h}</th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {fields.map((field, i) => {
                            return (
                                <tr key={field.id}>
                                    <td className="p-2 border text-center">
                                        <Input disabled value={String(i + 1)} className="bg-gray-100 text-center" />
                                    </td>

                                    <td className="p-2 border">
                                        <Input {...register(`records.${i}.letterNo`)} />
                                    </td>

                                    <td className="p-2 border">
                                        <Input type="date" {...register(`records.${i}.date`)} />
                                    </td>

                                    <td className="p-2 border">
                                        <Input {...register(`records.${i}.teleCorres`)} />
                                    </td>

                                    <td className="p-2 border">
                                        <Input {...register(`records.${i}.briefContents`)} />
                                    </td>

                                    <td className="p-2 border">
                                        <Input {...register(`records.${i}.sigPICdr`)} />
                                    </td>

                                    <td className="p-2 border text-center">
                                        <Button type="button" variant="destructive" size="sm" onClick={() => remove(i)}>
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
                <Button
                    type="button"
                    onClick={() => append({ letterNo: "", date: "", teleCorres: "", briefContents: "", sigPICdr: "" })}
                >
                    + Add Row
                </Button>

                <Button type="submit" className="bg-[#40ba4d]">
                    Submit
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    className="hover:bg-destructive hover:text-white"
                    onClick={handleReset}
                >
                    {onClear ? "Clear Form" : "Reset"}
                </Button>
            </div>

            {/* Auto-save indicator */}
            <p className="text-sm text-muted-foreground text-center mt-2">
                * Changes are automatically saved (after 0.5s pause)
            </p>
        </form>
    );
}