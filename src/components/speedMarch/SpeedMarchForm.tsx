"use client";

import React, { useEffect, useMemo } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UniversalTable, TableColumn, TableConfig } from "@/components/layout/TableLayout";
import type { SpeedMarchRecord } from "@/app/lib/api/speedMarchApi";
import { termColumns } from "@/constants/app.constants";

type Row = {
    id?: string;
    test: string;
    timing10Label?: string;
    distance10?: string;
    timing20Label?: string;
    distance20?: string;
    timing30Label?: string;
    distance30?: string;
    marks?: string;
    remark?: string;
};

type FormValues = {
    records: Row[];
};

interface Props {
    semesterNumber: number;
    inputPrefill: Row[];
    savedRecords: SpeedMarchRecord[];
    onSave: (values: FormValues) => Promise<void>;
    isEditing: boolean;
    onCancelEdit: () => void;
    disabled?: boolean;
    formMethods?: UseFormReturn<FormValues>;
}

export default function SpeedMarchForm({
    semesterNumber,
    inputPrefill,
    onSave,
    isEditing,
    onCancelEdit,
    disabled = false,
    formMethods,
}: Props) {
    /**  Always call hooks at the top level — NEVER conditionally */
    const internalForm = useForm<FormValues>({
        defaultValues: { records: inputPrefill },
    });

    const methods = formMethods ?? internalForm;

    const { register, handleSubmit, reset } = methods;

    /** Safe timing + distance column selection */
    const term = termColumns[semesterNumber - 4];
    const timingKey = term?.timing as keyof Row;
    const distanceKey = term?.distance as keyof Row;

    /** Protect from undefined termColumns */
    const merged = useMemo<Row[]>(() => {
        if (!timingKey || !distanceKey) return inputPrefill;

        return inputPrefill.map((pref) => ({
            ...pref,
            [timingKey]: pref[timingKey] ?? "",
            [distanceKey]: pref[distanceKey] ?? "",
        }));
    }, [inputPrefill, timingKey, distanceKey]);

    /** Sync form values */
    useEffect(() => {
        reset({ records: merged });
    }, [merged, reset]);

    /** Get distance label based on semester */
    const distanceLabel = useMemo(() => {
        if (semesterNumber === 4) return "10 KM";
        if (semesterNumber === 5) return "20 KM";
        return "30 KM";
    }, [semesterNumber]);

    const columns: TableColumn<Row>[] = [
        {
            key: "test",
            label: "Test",
            render: (value) => value ?? "-"
        },
        {
            key: timingKey,
            label: "Timings",
            render: (value) => (value as string) ?? ""
        },
        {
            key: distanceKey,
            label: distanceLabel,
            render: (value, row, index) => (
                <Input
                    {...register(`records.${index}.${distanceKey}` as const)}
                    defaultValue={(value as string) ?? ""}
                    disabled={!isEditing || disabled}
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

            {/* Bottom Buttons */}
            <div className="flex justify-center gap-3 mt-6">
                {isEditing && (
                    <>
                        <Button type="submit" disabled={disabled}>
                            Save
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => reset({ records: merged })}
                            disabled={disabled}
                        >
                            Reset
                        </Button>

                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onCancelEdit}
                            disabled={disabled}
                        >
                            Cancel
                        </Button>
                    </>
                )}
            </div>
        </form>
    );
}
