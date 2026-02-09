"use client";

import { useEffect } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import type { DisciplineForm as DisciplineFormType } from "@/types/dicp-records";
import { saveDisciplineForm } from "@/store/slices/disciplineRecordsSlice";
import { usePunishments } from "@/hooks/usePunishments";

interface Props {
    onSubmit: (data: DisciplineFormType) => Promise<void> | void;
    defaultValues: DisciplineFormType;
    ocId: string;
    onClear: () => void;
}

export default function DisciplineForm({ onSubmit, defaultValues, ocId, onClear }: Props) {
    const dispatch = useDispatch();
    const { punishments, fetchPunishments } = usePunishments();

    // useEffect(() => {
    //     fetchPunishments();
    // }, []);

    const form = useForm<DisciplineFormType>({
        defaultValues,
    });

    const { control, handleSubmit, register, watch, setValue } = form;
    const { fields, append, remove } = useFieldArray({ control, name: "records" });

    // watch all records to compute negative pts and cumulative
    const watched = useWatch({ control, name: "records" }) || [];

    useEffect(() => {
        // Auto-calculate negativePts and cumulative for each row
        let total = 0;
        let hasChanges = false;

        for (let i = 0; i < (watched?.length ?? 0); i += 1) {
            const rec = watched[i] ?? {};

            // Find the selected punishment to get marksDeduction
            const selectedPunishment = punishments.find(p => p.title === rec.punishmentAwarded);
            const marksDeduction = selectedPunishment?.marksDeduction ?? 0;
            const numPunishments = Number(rec.numberOfPunishments ?? 1);

            // Calculate negative points = marksDeduction * numberOfPunishments
            const calculatedNegativePts = marksDeduction * numPunishments;

            // Only update if the calculated value is different (prevent infinite loop)
            if (String(calculatedNegativePts) !== rec.negativePts) {
                setValue(`records.${i}.negativePts`, String(calculatedNegativePts), {
                    shouldDirty: true,
                    shouldTouch: false,
                    shouldValidate: false
                });
                hasChanges = true;
            }

            // Calculate cumulative
            total += calculatedNegativePts;
            if (String(total) !== rec.cumulative) {
                setValue(`records.${i}.cumulative`, String(total), {
                    shouldDirty: true,
                    shouldTouch: false,
                    shouldValidate: false
                });
                hasChanges = true;
            }
        }
    }, [
        watched?.length,
        watched?.map(r => r?.punishmentAwarded).join(','),
        watched?.map(r => r?.numberOfPunishments).join(','),
        punishments.length,
        setValue
    ]);

    // Auto-save to Redux on form changes
    useEffect(() => {
        const subscription = watch((value) => {
            if (ocId && value.records && value.records.length > 0) {
                const formData = value.records.map(record => ({
                    serialNo: record?.serialNo || "",
                    dateOfOffence: record?.dateOfOffence || "",
                    offence: record?.offence || "",
                    punishmentAwarded: record?.punishmentAwarded || "",
                    punishmentId: record?.punishmentId || "",
                    numberOfPunishments: record?.numberOfPunishments || "1",
                    dateOfAward: record?.dateOfAward || "",
                    byWhomAwarded: record?.byWhomAwarded || "",
                    negativePts: record?.negativePts || "",
                    cumulative: record?.cumulative || "",
                }));

                dispatch(saveDisciplineForm({ ocId, data: formData }));
            }
        });
        return () => subscription.unsubscribe();
    }, [watch, dispatch, ocId]);

    // helper for append with defaults
    const handleAppend = () =>
        append({
            serialNo: "",
            dateOfOffence: "",
            offence: "",
            punishmentAwarded: "",
            punishmentId: "",
            numberOfPunishments: "1",
            dateOfAward: "",
            byWhomAwarded: "",
            negativePts: "",
            cumulative: "",
        });

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="overflow-auto border rounded-lg shadow">
                <table className="w-full table-fixed text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border w-16">S.No</th>
                            <th className="p-2 border w-32">Date Of Offence</th>
                            <th className="p-2 border">Offence</th>
                            <th className="p-2 border w-48">Punishment Awarded</th>
                            <th className="p-2 border w-32">No. of Punishments</th>
                            <th className="p-2 border w-32">Date Of Award</th>
                            <th className="p-2 border">By Whom Awarded</th>
                            <th className="p-2 border w-24">Negative Pts</th>
                            <th className="p-2 border w-24">Cumulative</th>
                            <th className="p-2 border w-24">Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {fields.map((field, index) => {
                            const currentRecord = watched?.[index];

                            return (
                                <tr key={field.id}>
                                    <td className="p-2 border text-center">
                                        <Input disabled value={String(index + 1)} className="bg-gray-100 text-center" />
                                    </td>

                                    <td className="p-2 border">
                                        <Input type="date" {...register(`records.${index}.dateOfOffence`)} />
                                    </td>

                                    <td className="p-2 border">
                                        <Input {...register(`records.${index}.offence`)} />
                                    </td>

                                    <td className="p-2 border">
                                        <Select
                                            value={currentRecord?.punishmentAwarded || ""}
                                            onValueChange={(value) => {
                                                // Find the selected punishment to get its ID
                                                const selectedPunishment = punishments.find(p => p.title === value);

                                                setValue(`records.${index}.punishmentAwarded`, value, {
                                                    shouldDirty: true,
                                                    shouldTouch: true
                                                });

                                                // Store the punishment ID
                                                if (selectedPunishment?.id) {
                                                    setValue(`records.${index}.punishmentId`, selectedPunishment.id, {
                                                        shouldDirty: true,
                                                        shouldTouch: true
                                                    });
                                                }
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select punishment" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {punishments.map((punishment) => (
                                                    <SelectItem key={punishment.id} value={punishment.title}>
                                                        {punishment.title} ({punishment.marksDeduction} pts)
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </td>

                                    <td className="p-2 border">
                                        <Input
                                            type="number"
                                            min="1"
                                            {...register(`records.${index}.numberOfPunishments`)}
                                            defaultValue="1"
                                        />
                                    </td>

                                    <td className="p-2 border">
                                        <Input type="date" {...register(`records.${index}.dateOfAward`)} />
                                    </td>

                                    <td className="p-2 border">
                                        <Input {...register(`records.${index}.byWhomAwarded`)} />
                                    </td>

                                    <td className="p-2 border">
                                        <Input
                                            disabled
                                            value={currentRecord?.negativePts || "0"}
                                            className="bg-gray-100 text-center"
                                        />
                                    </td>

                                    <td className="p-2 border">
                                        {/* show cumulative only if negative, otherwise show blank (but keep value in form) */}
                                        <Input
                                            disabled
                                            value={
                                                Number((currentRecord?.cumulative ?? "0")) < 0
                                                    ? String(currentRecord.cumulative)
                                                    : ""
                                            }
                                            className="bg-gray-100 text-center"
                                        />
                                    </td>

                                    <td className="p-2 border text-center">
                                        <button
                                            type="button"
                                            onClick={() => remove(index)}
                                            className="inline-block px-2 py-1 bg-red-600 text-white rounded text-xs"
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex justify-center gap-3">
                <Button type="button" onClick={handleAppend}>
                    + Add Row
                </Button>

                <Button type="submit" className="bg-[#40ba4d]">
                    Submit
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    className="hover:bg-destructive hover:text-white"
                    onClick={onClear}
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