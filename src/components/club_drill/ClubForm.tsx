"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UniversalTable, TableColumn, TableConfig } from "@/components/layout/TableLayout";
import {
    UseFormRegister,
    FieldArrayWithId,
} from "react-hook-form";
import { FormValues } from "@/types/club-detls";

interface Props {
    register: UseFormRegister<FormValues>;
    fields: FieldArrayWithId<FormValues, "clubRows", "id">[];
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
    const columns: TableColumn<FieldArrayWithId<FormValues, "clubRows", "id">>[] = [
        {
            key: "semester",
            label: "Semester",
            render: (value, row, index) => (
                <>
                    <input type="hidden"
                        {...register(`clubRows.${index}.id` as const)}
                    />
                    <Input
                        {...register(`clubRows.${index}.semester` as const)}
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
                    {...register(`clubRows.${index}.clubName` as const)}
                    disabled={disabled}
                />
            )
        },
        {
            key: "splAchievement",
            label: "Spl Achievement",
            render: (value, row, index) => (
                <Input
                    {...register(`clubRows.${index}.splAchievement` as const)}
                    disabled={disabled}
                />
            )
        },
        {
            key: "remarks",
            label: "Remarks",
            render: (value, row, index) => (
                <Input
                    {...register(`clubRows.${index}.remarks` as const)}
                    disabled={disabled}
                />
            )
        }
    ];

    const config: TableConfig<FieldArrayWithId<FormValues, "clubRows", "id">> = {
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
                <UniversalTable<FieldArrayWithId<FormValues, "clubRows", "id">>
                    data={fields}
                    config={config}
                />
            </div>

            {disabled ? (
                <div className="flex justify-center mt-4">
                    <Button
                        type="button"
                        className="bg-primary text-primary-foreground"
                        onClick={onEdit}
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
                        Reset Club
                    </Button>
                </div>
            )}
        </form>
    );
}
