"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UniversalTable, TableColumn, TableConfig } from "@/components/layout/TableLayout";
import { UseFormRegister, FieldArrayWithId } from "react-hook-form";
import { FormValues } from "@/types/club-detls";

interface Props {
    register: UseFormRegister<FormValues>;
    fields: FieldArrayWithId<FormValues, "drillRows", "id">[];
    onSubmit?: (e?: any) => void;
    onReset?: () => void;
    disabled?: boolean;
    onEdit?: () => void;
}

export default function DrillForm({ register, fields, onSubmit, onReset, disabled = false, onEdit }: Props) {
    const columns: TableColumn<FieldArrayWithId<FormValues, "drillRows", "id">>[] = [
        {
            key: "semester",
            label: "Semester",
            render: (value, row, index) => (
                <>
                    <input type="hidden" {...register(`drillRows.${index}.id` as const)} />
                    <Input
                        {...register(`drillRows.${index}.semester` as const)}
                        readOnly
                        disabled
                        className="bg-gray-100 cursor-not-allowed"
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
                    type="number"
                    {...register(`drillRows.${index}.maxMks` as const)}
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
                    type="number"
                    {...register(`drillRows.${index}.m1` as const)}
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
                    type="number"
                    {...register(`drillRows.${index}.m2` as const)}
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
                    type="number"
                    {...register(`drillRows.${index}.a1c1` as const)}
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
                    type="number"
                    {...register(`drillRows.${index}.a2c2` as const)}
                    disabled={disabled}
                />
            )
        },
        {
            key: "remarks",
            label: "Remarks",
            render: (value, row, index) => (
                <Input
                    {...register(`drillRows.${index}.remarks` as const)}
                    disabled={disabled}
                />
            )
        }
    ];

    const config: TableConfig<FieldArrayWithId<FormValues, "drillRows", "id">> = {
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
                <UniversalTable<FieldArrayWithId<FormValues, "drillRows", "id">>
                    data={fields}
                    config={config}
                />
            </div>

            {disabled ? (
                <div className="flex justify-center mt-4">
                    <Button type="button" className="bg-blue-600 text-white" onClick={onEdit}>
                        Edit Drill
                    </Button>
                </div>
            ) : (
                <div className="flex justify-center gap-4 mt-6">
                    <Button type="submit" className="bg-blue-600 text-white">
                        Save Drill
                    </Button>
                    <Button type="button" variant="outline" onClick={onReset}>
                        Reset Drill
                    </Button>
                </div>
            )}
        </form>
    );
}
