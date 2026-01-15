"use client";

import React, { useEffect, useMemo } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UniversalTable, TableColumn, TableConfig } from "@/components/layout/TableLayout";
import { TermData } from "@/types/obstacleTrg";

type Row = {
    id?: string;
    obstacle: string;
    obtained: string;
    remark?: string;
};

interface Props {
    semesterNumber: number;
    onSave: (values: TermData) => Promise<void>;
    isEditing: boolean;
    onCancelEdit: () => void;
    disabled?: boolean;
    isSaving?: boolean;
    formMethods?: UseFormReturn<TermData>;
}

export default function ObstacleTrainingForm({
    semesterNumber,
    onSave,
    isEditing,
    onCancelEdit,
    disabled = false,
    isSaving = false,
    formMethods,
}: Props) {
    const internalForm = useForm<TermData>({
        defaultValues: { records: [] },
    });

    const methods = formMethods ?? internalForm;

    const { register, handleSubmit, reset, watch, getValues } = methods;

    const watched = watch("records");
    const currentRecords = watched || getValues("records") || [];

    const columns: TableColumn<Row>[] = [
        {
            key: "index",
            label: "No",
            render: (value, row, index) => {
                const isTotalRow = row.obstacle === "Total";
                return isTotalRow ? "" : index + 1;
            }
        },
        {
            key: "obstacle",
            label: "Obstacle",
            render: (value) => value
        },
        {
            key: "obtained",
            label: "Marks Obtained",
            type: "number",
            render: (value, row, index) => {
                const isTotalRow = row.obstacle === "Total";

                if (isTotalRow) {
                    const total = currentRecords
                        .filter((r: Row) => r.obstacle !== "Total")
                        .reduce((sum: number, r: Row) => sum + (parseFloat(r.obtained || "0") || 0), 0);

                    return <span className="text-center block font-semibold">{total}</span>;
                }

                return (
                    <Input
                        {...register(`records.${index}.obtained`)}
                        type="number"
                        defaultValue={value}
                        disabled={!isEditing || disabled}
                    />
                );
            }
        },
        {
            key: "remark",
            label: "Remarks",
            render: (value, row, index) => {
                const isTotalRow = row.obstacle === "Total";

                if (isTotalRow) {
                    return <span className="text-center block">—</span>;
                }

                return (
                    <Input
                        {...register(`records.${index}.remark`)}
                        type="text"
                        defaultValue={value}
                        disabled={!isEditing || disabled}
                    />
                );
            }
        }
    ];

    // Add total row to data
    const tableData = useMemo(() => {
        const records = currentRecords.filter((r: Row) => r.obstacle !== "Total");
        const totalRow: Row = {
            obstacle: "Total",
            obtained: String(
                records.reduce((sum: number, r: Row) => sum + (parseFloat(r.obtained || "0") || 0), 0)
            ),
            remark: "—"
        };
        return [...records, totalRow];
    }, [currentRecords]);

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

    return (
        <form onSubmit={handleSubmit(onSave)}>
            <div className="border rounded-lg shadow">
                <UniversalTable<Row>
                    data={tableData}
                    config={config}
                />
            </div>

            {/* Action Buttons */}
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