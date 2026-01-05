"use client";

import { Input } from "@/components/ui/input";
import { Row as SemesterRow } from "@/types/sportsAwards";
import { Controller } from "react-hook-form";
import { UniversalTable, TableColumn, TableConfig } from "@/components/layout/TableLayout";

interface Props {
    title: string;
    termKey: string;
    rows: SemesterRow[];
    savedRows: SemesterRow[];
    control: any;
    disabled?: boolean;
    hideStringAndMaxMarks?: boolean;
}

export default function SportsGamesTable({
    title,
    termKey,
    rows,
    savedRows,
    control,
    disabled = false,
    hideStringAndMaxMarks = false,
}: Props) {
    const columns: TableColumn<SemesterRow>[] = [
        {
            key: "activity",
            label: "Games / Awards",
            render: (value) => value ?? "-"
        }
    ];

    if (!hideStringAndMaxMarks) {
        columns.push({
            key: "string",
            label: "String",
            render: (value, row, index) => (
                <Controller
                    name={`${termKey}.${index}.string`}
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            disabled={disabled || hideStringAndMaxMarks}
                        />
                    )}
                />
            )
        });

        columns.push({
            key: "maxMarks",
            label: "Max Marks",
            type: "number",
            render: (value, row, index) => (
                <Controller
                    name={`${termKey}.${index}.maxMarks`}
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            type="number"
                            disabled={disabled || hideStringAndMaxMarks}
                        />
                    )}
                />
            )
        });
    }

    columns.push({
        key: "obtained",
        label: "Obtained",
        type: "number",
        render: (value, row, index) => (
            <Controller
                name={`${termKey}.${index}.obtained`}
                control={control}
                render={({ field }) => (
                    <Input
                        {...field}
                        type="number"
                        disabled={disabled}
                    />
                )}
            />
        )
    });

    const config: TableConfig<SemesterRow> = {
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
        <div className="mb-10">
            <h2 className="font-semibold text-md mb-2 underline">{title}</h2>

            <div className="border rounded-lg shadow">
                <UniversalTable<SemesterRow>
                    data={rows}
                    config={config}
                />
            </div>
        </div>
    );
}
