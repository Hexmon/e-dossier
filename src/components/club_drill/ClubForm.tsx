"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UniversalTable, TableColumn, TableConfig } from "@/components/layout/TableLayout";
import {
    UseFormRegister,
    FieldArrayWithId,
} from "react-hook-form";
import { FormValues } from "@/types/club-detls";

type ClubField = FieldArrayWithId<FormValues, "clubRows", "fieldId">;

interface Props {
    register: UseFormRegister<FormValues>;
    fields: ClubField[];
    onSubmit?: (e?: any) => void;
    onReset?: () => void;
    disabled?: boolean;
    onEdit?: () => void;
}

export default function ClubForm({
    register,
    fields,
    onSubmit,
    onReset,
    disabled = false,
    onEdit
}: Props) {
    const columns: TableColumn<ClubField>[] = [
        {
            key: "semester",
            label: "Semester",
            render: (value, row, index) => (
                <>
                    <input type="hidden"
                        key={`${row.fieldId}-id`}
                        {...register(`clubRows.${index}.id` as const)}
                        defaultValue={row.id ?? ""}
                    />
                    <Input
                        key={`${row.fieldId}-semester`}
                        {...register(`clubRows.${index}.semester` as const)}
                        defaultValue={row.semester ?? ""}
                        readOnly
                        disabled
                        className="bg-muted/70 cursor-not-allowed"
                    />
                </>
            )
        },
        {
            key: "clubName",
            label: "Name of Club",
            render: (value, row, index) => (
                <Input
                    key={`${row.fieldId}-clubName`}
                    {...register(`clubRows.${index}.clubName` as const)}
                    defaultValue={row.clubName ?? ""}
                    disabled={disabled}
                />
            )
        },
        {
            key: "splAchievement",
            label: "Spl Achievement",
            render: (value, row, index) => (
                <Input
                    key={`${row.fieldId}-splAchievement`}
                    {...register(`clubRows.${index}.splAchievement` as const)}
                    defaultValue={row.splAchievement ?? ""}
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
                    {...register(`clubRows.${index}.remarks` as const)}
                    defaultValue={row.remarks ?? ""}
                    disabled={disabled}
                />
            )
        }
    ];

    const config: TableConfig<ClubField> = {
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
        <form onSubmit={onSubmit} className="space-y-6">
            <div className="border rounded-lg shadow-sm">
                <UniversalTable<ClubField>
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
                        Edit Club
                    </Button>
                </div>
            ) : (
                <div className="flex justify-center gap-4 mt-6">
                    <Button type="submit" className="bg-primary text-primary-foreground">
                        Save Club
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onReset}
                    >
                        Cancel
                    </Button>
                </div>
            )}
        </form>
    );
}
