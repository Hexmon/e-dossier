"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UniversalTable, TableColumn, TableConfig } from "@/components/layout/TableLayout";
import { UseFormRegister, FieldArrayWithId } from "react-hook-form";
import { FormValues } from "@/types/club-detls";

type DrillField = FieldArrayWithId<FormValues, "drillRows", "fieldId">;

interface Props {
    register: UseFormRegister<FormValues>;
    fields: DrillField[];
    onSubmit?: (e?: any) => void;
    onReset?: () => void;
    disabled?: boolean;
    onEdit?: () => void;
}

export default function DrillForm({ register, fields, onSubmit, onReset, disabled = false, onEdit }: Props) {
    const columns: TableColumn<DrillField>[] = [
        {
            key: "semester",
            label: "Semester",
            render: (value, row, index) => (
                <>
                    <input
                        key={`${row.fieldId}-id`}
                        type="hidden"
                        {...register(`drillRows.${index}.id` as const)}
                        defaultValue={row.id ?? ""}
                    />
                    <Input
                        key={`${row.fieldId}-semester`}
                        {...register(`drillRows.${index}.semester` as const)}
                        defaultValue={row.semester ?? ""}
                        readOnly
                        disabled
                        className="bg-muted/70 cursor-not-allowed"
                    />
                </>
            )
        },
        {
            key: "maxMks",
            label: "Max Mks",
            type: "number",
            render: (value, row, index) => (
                <Input
                    key={`${row.fieldId}-maxMks`}
                    type="number"
                    {...register(`drillRows.${index}.maxMks` as const)}
                    defaultValue={row.maxMks ?? ""}
                    disabled={disabled}
                />
            )
        },
        {
            key: "m1",
            label: "M1",
            type: "number",
            render: (value, row, index) => (
                <Input
                    key={`${row.fieldId}-m1`}
                    type="number"
                    {...register(`drillRows.${index}.m1` as const)}
                    defaultValue={row.m1 ?? ""}
                    disabled={disabled}
                />
            )
        },
        {
            key: "m2",
            label: "M2",
            type: "number",
            render: (value, row, index) => (
                <Input
                    key={`${row.fieldId}-m2`}
                    type="number"
                    {...register(`drillRows.${index}.m2` as const)}
                    defaultValue={row.m2 ?? ""}
                    disabled={disabled}
                />
            )
        },
        {
            key: "a1c1",
            label: "A1/C1",
            type: "number",
            render: (value, row, index) => (
                <Input
                    key={`${row.fieldId}-a1c1`}
                    type="number"
                    {...register(`drillRows.${index}.a1c1` as const)}
                    defaultValue={row.a1c1 ?? ""}
                    disabled={disabled}
                />
            )
        },
        {
            key: "a2c2",
            label: "A2/C2",
            type: "number",
            render: (value, row, index) => (
                <Input
                    key={`${row.fieldId}-a2c2`}
                    type="number"
                    {...register(`drillRows.${index}.a2c2` as const)}
                    defaultValue={row.a2c2 ?? ""}
                    disabled={disabled}
                />
            )
        },
        {
            key: "remarks",
            label: "Remarks",
            render: (value, row, index) => (
                <Input
                    key={`${row.fieldId}-remarks`}
                    {...register(`drillRows.${index}.remarks` as const)}
                    defaultValue={row.remarks ?? ""}
                    disabled={disabled}
                />
            )
        }
    ];

    const config: TableConfig<DrillField> = {
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
        },
        theme: {
            variant: "blue"
        }
    };

    return (
        <form onSubmit={onSubmit ?? ((e) => e.preventDefault())} className="space-y-6">

            <div className="text-center font-semibold underline text-primary text-lg mt-6">
                ASSESSMENT : DRILL
            </div>

            <div className="border rounded-lg shadow-sm">
                <UniversalTable<DrillField>
                    data={fields}
                    config={config}
                />
            </div>

            {disabled ? (
                <div className="flex justify-center mt-4">
                    <Button
                        type="button"
                        className="bg-primary text-primary-foreground"
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onEdit?.();
                        }}
                    >
                        Edit Drill
                    </Button>
                </div>
            ) : (
                <div className="flex justify-center gap-4 mt-6">
                    <Button type="submit" className="bg-primary text-primary-foreground">
                        Save Drill
                    </Button>
                    <Button type="button" variant="outline" onClick={onReset}>
                        Cancel
                    </Button>
                </div>
            )}
        </form>
    );
}
