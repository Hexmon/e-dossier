"use client";

import React, { useEffect, useMemo } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UniversalTable, TableColumn, TableConfig } from "@/components/layout/TableLayout";
import type { ObstacleTrainingRecord } from "@/app/lib/api/obstacleTrainingApi";
import { TermData } from "@/types/obstacleTrg";

function hasSubject(
    r: ObstacleTrainingRecord
): r is ObstacleTrainingRecord & { subject: string } {
    return typeof (r as Record<string, unknown>).subject === "string";
}

type Row = {
    id?: string;
    obstacle: string;
    obtained: string;
    remark?: string;
};

interface Props {
    semesterNumber: number;
    inputPrefill: Row[];
    savedRecords: ObstacleTrainingRecord[];
    onSave: (values: TermData) => Promise<void>;
    isEditing: boolean;
    onCancelEdit: () => void;
    disabled?: boolean;
    formMethods?: UseFormReturn<TermData>;
}

export default function ObstacleTrainingForm({
    semesterNumber,
    inputPrefill,
    savedRecords,
    onSave,
    isEditing,
    onCancelEdit,
    disabled = false,
    formMethods,
}: Props) {
    const internalForm = useForm<TermData>({
        defaultValues: { records: inputPrefill },
    });

    const methods = formMethods ?? internalForm;

    const { register, handleSubmit, reset, watch } = methods;

    const merged = useMemo<Row[]>(() => {
        return inputPrefill.map((pref) => {
            const obstacle = pref.obstacle ?? "-";
            const prefObtained = pref.obtained ?? "";
            const prefRemark = pref.remark ?? "";

            const match = [...savedRecords]
                .reverse()
                .find(
                    (r) =>
                        ((hasSubject(r) ? r.subject : r.obstacle) ?? "") === obstacle &&
                        Number(r.semester ?? 0) === Number(semesterNumber)
                );

            return {
                id: match?.id ?? pref.id,
                obstacle,
                obtained: match ? String(match.marksObtained ?? "") : String(prefObtained),
                remark: match ? String(match.remark ?? "") : String(prefRemark),
            };
        });
    }, [inputPrefill, savedRecords, semesterNumber]);

    /** Sync merged rows into React Hook Form */
    useEffect(() => {
        reset({ records: merged });
    }, [merged, reset]);

    const watched = watch("records");

    // Add total row to data
    const totalRow: Row = {
        obstacle: "Total",
        obtained: String(
            (watched ?? merged)
                .slice(0, merged.length)
                .reduce(
                    (sum, r) =>
                        sum + (parseFloat(r.obtained || "0") || 0),
                    0
                )
        ),
        remark: "—"
    };

    const tableData = [...merged, totalRow];

    const columns: TableColumn<Row>[] = [
        {
            key: "index",
            label: "No",
            render: (value, row, index) => {
                return index + 1;
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
                const isTotalRow = index === merged.length;

                if (isTotalRow) {
                    return (
                        <span className="text-center block">
                            {(watched ?? merged)
                                .slice(0, merged.length)
                                .reduce(
                                    (sum, r) =>
                                        sum + (parseFloat(r.obtained || "0") || 0),
                                    0
                                )}
                        </span>
                    );
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
                const isTotalRow = index === merged.length;

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
                    data={tableData}
                    config={config}
                />
            </div>

            {/* Action Buttons */}
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
