"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { UniversalTable, TableColumn, TableConfig } from "@/components/layout/TableLayout";

export type TableRow = {
    id?: string;
    subject: string;
    maxMarks: number;
    obtained: string; 
};

interface Props {
    title?: string;
    inputRows: TableRow[];
    register: any;
    total: number | string;
    disabled?: boolean;
}

export default function WeaponTrainingTable({ title, inputRows, register, total, disabled }: Props) {
    // Add total row to data
    const totalRow: TableRow = {
        subject: "Total",
        maxMarks: inputRows.reduce((s, r) => s + r.maxMarks, 0),
        obtained: String(total)
    };

    const tableData = [...inputRows, totalRow];

    const columns: TableColumn<TableRow>[] = [
        {
            key: "index",
            label: "No",
            render: (value, row, index) => {
                return index + 1;
            }
        },
        {
            key: "subject",
            label: "Subject",
            render: (value) => value
        },
        {
            key: "maxMarks",
            label: "Max Marks",
            type: "number",
            render: (value) => value
        },
        {
            key: "obtained",
            label: "Marks Obtained",
            type: "number",
            render: (value, row, index) => {
                const isTotalRow = index === inputRows.length;
                
                if (isTotalRow) {
                    return <span className="text-center block">{total}</span>;
                }

                return (
                    <Input
                        {...register(`records.${index}.obtained`)}
                        type="number"
                        placeholder="Enter Marks"
                        className="w-full"
                        disabled={disabled}
                    />
                );
            }
        }
    ];

    const config: TableConfig<TableRow> = {
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
        <div className="space-y-6">
            {title && <h3 className="font-semibold text-md mb-2 underline">{title}</h3>}

            <div className="border rounded-lg shadow">
                <UniversalTable<TableRow>
                    data={tableData}
                    config={config}
                />
            </div>
        </div>
    );
}
