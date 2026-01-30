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
    savedRecords: SpeedMarchRecord[];
    onSave: (values: FormValues) => Promise<void>;
    isEditing: boolean;
    onCancelEdit: () => void;
    disabled?: boolean;
    isSaving?: boolean;
    formMethods?: UseFormReturn<FormValues>;
}

export default function SpeedMarchForm({
    semesterNumber,
    onSave,
    isEditing,
    onCancelEdit,
    disabled = false,
    isSaving = false,
    formMethods,
}: Props) {
    const internalForm = useForm<FormValues>({
        defaultValues: { records: [] },
    });

    const methods = formMethods ?? internalForm;

    const { register, handleSubmit, reset, getValues } = methods;

    // Safe timing + distance column selection
    const term = termColumns[semesterNumber - 4];
    const timingKey = term?.timing as keyof Row;
    const distanceKey = term?.distance as keyof Row;

    // Get distance label based on semester
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

    const handleReset = () => {
        const values = getValues();
        reset(values);
    };

    // Get current form data
    const currentRecords = getValues("records") || [];

    return (
        <form onSubmit={handleSubmit(onSave)}>
            <div className="border rounded-lg shadow">
                <UniversalTable<Row>
                    data={currentRecords}
                    config={config}
                />
            </div>

            {/* Bottom Buttons */}
            <div className="flex justify-center gap-3 mt-6">
                {isEditing && (
                    <>
                        <Button
                            type="submit"
                            disabled={disabled || isSaving}
                            className="bg-[#40ba4d]"
                        >
                            {isSaving ? "Saving..." : "Save"}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleReset}
                            disabled={disabled || isSaving}
                        >
                            Reset
                        </Button>

                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onCancelEdit}
                            disabled={disabled || isSaving}
                        >
                            Cancel
                        </Button>
                    </>
                )}
            </div>
        </form>
    );
}