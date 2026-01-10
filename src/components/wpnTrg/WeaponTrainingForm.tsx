"use client";

import React, { useEffect, useMemo } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UniversalTable, TableColumn, TableConfig } from "@/components/layout/TableLayout";
import type { WeaponTrainingRecord } from "@/app/lib/api/weaponTrainingApi";

type Row = {
    subject: string;
    maxMarks: number;
    obtained: string;
};

type FormValues = {
    records: Row[];
    achievements: { achievement: string }[];
};

interface Props {
    semesterNumber: number;
    inputPrefill: Row[];
    savedRecords: WeaponTrainingRecord[];
    onSave: (values: FormValues) => Promise<void>;
    disabled?: boolean;
    editing?: boolean;
    onEdit?: () => void;
    onCancel?: () => void;
    onReset?: () => void;
    isSaving?: boolean;
    formMethods?: UseFormReturn<FormValues>;
}

export default function WeaponTrainingForm({
    semesterNumber,
    inputPrefill,
    savedRecords,
    onSave,
    disabled = false,
    editing = false,
    onEdit,
    onCancel,
    onReset,
    isSaving = false,
    formMethods,
}: Props) {
    /** ALWAYS call hook at top-level */
    const internalForm = useForm<FormValues>({
        defaultValues: {
            records: inputPrefill,
            achievements: []
        },
    });

    const methods = formMethods ?? internalForm;

    const { register, handleSubmit, reset, watch } = methods;

    /**
     * Merged values:
     * - Prefill values
     * - Latest saved record override
     */
    const merged = useMemo<Row[]>(() => {
        return inputPrefill.map((pref) => {
            const match = [...savedRecords]
                .reverse()
                .find(
                    (s) =>
                        s.subject === pref.subject &&
                        Number(s.semester) === Number(semesterNumber)
                );

            return {
                subject: pref.subject ?? "-",
                maxMarks: pref.maxMarks ?? 0,
                obtained: match
                    ? String(match.marksObtained ?? "")
                    : String(pref.obtained ?? ""),
            };
        });
    }, [inputPrefill, savedRecords, semesterNumber]);

    /** Sync form on merged change */
    useEffect(() => {
        reset({ records: merged });
    }, [merged, reset]);

    const watched = watch("records");

    const columns: TableColumn<Row>[] = [
        {
            key: "subject",
            label: "Subject",
            render: (value) => value ?? "-"
        },
        {
            key: "maxMarks",
            label: "Max Marks",
            type: "number",
            render: (value, row, index) => (
                <Input
                    {...register(`records.${index}.maxMarks`, {
                        valueAsNumber: true,
                    })}
                    type="number"
                    defaultValue={value ?? 0}
                    disabled={disabled}
                />
            )
        },
        {
            key: "obtained",
            label: "Obtained",
            type: "number",
            render: (value, row, index) => (
                <Input
                    {...register(`records.${index}.obtained`)}
                    type="number"
                    defaultValue={value ?? ""}
                    disabled={disabled}
                />
            )
        }
    ];

    const config: TableConfig<Row> = {
        columns,
        features: {
            sorting: false,
            filtering: false,
            pagination: false,
            selection: false,
            search: false
        },
        styling: {
            compact: false,
            bordered: true,
            striped: false,
            hover: false
        }
    };

    return (
        <form onSubmit={handleSubmit(onSave)}>
            <div className="border rounded-lg shadow">
                <UniversalTable<Row>
                    data={merged}
                    config={config}
                />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-3 mt-6">
                {editing ? (
                    <>
                        <Button
                            type="submit"
                            disabled={isSaving}
                            className="bg-[#40ba4d]"
                        >
                            {isSaving ? "Saving..." : "Save Training"}
                        </Button>

                        {onCancel && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onCancel}
                                disabled={isSaving}
                            >
                                Cancel Edit
                            </Button>
                        )}

                        {onReset && (
                            <Button
                                type="button"
                                variant="outline"
                                className="hover:bg-destructive hover:text-white"
                                onClick={onReset}
                                disabled={isSaving}
                            >
                                Reset
                            </Button>
                        )}
                    </>
                ) : (
                    onEdit && (
                        <Button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                onEdit();
                            }}
                            disabled={isSaving}
                        >
                            Edit Training Table
                        </Button>
                    )
                )}
            </div>
        </form>
    );
}