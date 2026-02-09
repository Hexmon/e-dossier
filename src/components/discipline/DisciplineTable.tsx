"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { UniversalTable, TableColumn, TableAction, TableConfig } from "@/components/layout/TableLayout";
import type { DisciplineRow as HookRow } from "@/hooks/useDisciplineRecords";
import { usePunishments } from "@/hooks/usePunishments";

interface Props {
    rows: HookRow[] | undefined;
    loading: boolean;
    onEditSave: (id: string, payload: Partial<HookRow>) => Promise<void> | void;
    onDelete: (row: HookRow) => Promise<void> | void;
}

export default function DisciplineTable({ rows, loading, onEditSave, onDelete }: Props) {
    const { punishments, fetchPunishments } = usePunishments();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<HookRow> | null>(null);

    // useEffect(() => {
    //     fetchPunishments();
    // }, [fetchPunishments]);

    const changeEdit = <K extends keyof HookRow>(key: K, value: HookRow[K]) => {
        const updatedForm = { ...editForm, [key]: value };

        // Auto-calculate negativePts when punishment or numberOfPunishments changes
        if (key === "punishmentAwarded" || key === "numberOfPunishments") {
            const selectedPunishment = punishments.find(p => p.title === updatedForm.punishmentAwarded);
            const marksDeduction = selectedPunishment?.marksDeduction ?? 0;
            const numPunishments = Number(updatedForm.numberOfPunishments ?? 1);
            updatedForm.negativePts = String(marksDeduction * numPunishments);
        }

        setEditForm(updatedForm as Partial<HookRow>);
    };

    const saveEdit = async () => {
        if (!editingId || !editForm) return;
        await onEditSave(editingId, editForm);
        setEditingId(null);
        setEditForm(null);
    };

    const startEdit = (row: HookRow) => {
        setEditingId(row.id ?? null);
        setEditForm({ ...row });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm(null);
    };

    const columns: TableColumn<HookRow>[] = [
        {
            key: "serialNo",
            label: "S.No",
            width: "60px",
            render: (value) => value || "-"
        },
        {
            key: "dateOfOffence",
            label: "Date",
            type: "date",
            width: "w-25",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        type="date"
                        value={String(editForm?.dateOfOffence ?? (value === "-" || !value ? "" : value))}
                        onChange={(e) => changeEdit("dateOfOffence", e.target.value as any)}
                        className="w-25"
                    />
                ) : value || "-";
            }
        },
        {
            key: "offence",
            label: "Offence",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={String(editForm?.offence ?? value)}
                        onChange={(e) => changeEdit("offence", e.target.value as any)}
                    />
                ) : value || "-";
            }
        },
        {
            key: "punishmentAwarded",
            label: "Punishment",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Select
                        value={String(editForm?.punishmentAwarded ?? value)}
                        onValueChange={(val) => changeEdit("punishmentAwarded", val as any)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select punishment" />
                        </SelectTrigger>
                        <SelectContent>
                            {punishments.map((punishment) => (
                                <SelectItem key={punishment.id} value={punishment.title}>
                                    {punishment.title} ({punishment.marksDeduction} pts)
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : value || "-";
            }
        },
        {
            key: "numberOfPunishments",
            label: "No. of Punishments",
            type: "number",
            width: "80px",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        type="number"
                        min="1"
                        value={String(editForm?.numberOfPunishments ?? value ?? "1")}
                        onChange={(e) => changeEdit("numberOfPunishments", e.target.value as any)}
                        className="w-full"
                    />
                ) : value || "1";
            }
        },
        {
            key: "dateOfAward",
            label: "Date Awarded",
            type: "date",
            width: "w-25",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        type="date"
                        value={String(editForm?.dateOfAward ?? (value === "-" || !value ? "" : value))}
                        onChange={(e) => changeEdit("dateOfAward", e.target.value as any)}
                        className="w-25"
                    />
                ) : value || "-";
            }
        },
        {
            key: "byWhomAwarded",
            label: "By Whom",
            width: "120px",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={String(editForm?.byWhomAwarded ?? value)}
                        onChange={(e) => changeEdit("byWhomAwarded", e.target.value as any)}
                    />
                ) : value || "-";
            }
        },
        {
            key: "negativePts",
            label: "Negative Pts",
            type: "number",
            width: "90px",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        disabled
                        value={String(editForm?.negativePts ?? value)}
                        className="bg-gray-100 w-full"
                    />
                ) : value || "0";
            }
        },
        {
            key: "cumulative",
            label: "Cumulative",
            width: "90px",
            render: (value) => value ?? "0"
        }
    ];

    // Use separate actions with conditions instead of dynamic labels
    const actions: TableAction<HookRow>[] = useMemo(() => [
        {
            key: "edit",
            label: "Edit",
            variant: "outline",
            size: "sm",
            condition: (row) => editingId !== row.id,
            handler: (row) => startEdit(row)
        },
        {
            key: "delete",
            label: "Delete",
            variant: "destructive",
            size: "sm",
            condition: (row) => editingId !== row.id,
            handler: (row) => onDelete(row)
        },
        {
            key: "cancel",
            label: "Cancel",
            variant: "outline",
            size: "sm",
            condition: (row) => editingId === row.id,
            handler: () => cancelEdit()
        },
        {
            key: "save",
            label: "Save",
            variant: "default",
            size: "sm",
            condition: (row) => editingId === row.id,
            handler: () => saveEdit()
        }
    ], [editingId, onDelete]);

    const config: TableConfig<HookRow> = useMemo(() => ({
        columns,
        actions,
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
        emptyState: {
            message: "No data submitted yet for this semester."
        },
        loading
    }), [columns, actions, loading]);

    return (
        <div className="mb-6">
            <UniversalTable<HookRow>
                data={rows || []}
                config={config}
            />
        </div>
    );
}