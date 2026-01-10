"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UniversalTable, TableColumn, TableAction, TableConfig } from "@/components/layout/TableLayout";
import { toast } from "sonner";

import type { InspFormData } from "@/types/dossierInsp";

interface InspTableProps {
    data: InspFormData[];
    onDelete: (index: number) => void;
    onUpdate?: (index: number, updatedRow: InspFormData) => void;
}

export default function InspTable({ data, onDelete, onUpdate }: InspTableProps) {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValues, setEditValues] = useState<InspFormData>({
        date: "",
        rk: "",
        name: "",
        appointment: "",
        remarks: "",
        initials: "",
    });

    const startEdit = (index: number) => {
        const row = data[index];
        setEditingIndex(index);
        setEditValues({
            date: row.date ?? "",
            rk: row.rk ?? "",
            name: row.name ?? "",
            appointment: row.appointment ?? "",
            remarks: row.remarks ?? "",
            initials: row.initials ?? "",
        });
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setEditValues({
            date: "",
            rk: "",
            name: "",
            appointment: "",
            remarks: "",
            initials: "",
        });
    };

    const saveEdit = (index: number) => {
        if (onUpdate) {
            onUpdate(index, editValues);
            toast.success("Record updated successfully.");
        }
        cancelEdit();
    };

    const columns: TableColumn<InspFormData>[] = [
        {
            key: "date",
            label: "Date",
            render: (value, row, index) => {
                const isEditing = editingIndex === index;
                return isEditing ? (
                    <Input
                        type="date"
                        value={editValues.date}
                        onChange={(e) => setEditValues((p) => ({ ...p, date: e.target.value }))}
                    />
                ) : (
                    value || "-"
                );
            },
        },
        {
            key: "rk",
            label: "Rank",
            render: (value, row, index) => {
                const isEditing = editingIndex === index;
                return isEditing ? (
                    <Input
                        value={editValues.rk}
                        onChange={(e) => setEditValues((p) => ({ ...p, rk: e.target.value }))}
                        placeholder="Rank"
                    />
                ) : (
                    value || "-"
                );
            },
        },
        {
            key: "name",
            label: "Name",
            render: (value, row, index) => {
                const isEditing = editingIndex === index;
                return isEditing ? (
                    <Input
                        value={editValues.name}
                        onChange={(e) => setEditValues((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Name"
                    />
                ) : (
                    value || "-"
                );
            },
        },
        {
            key: "appointment",
            label: "Appointment",
            render: (value, row, index) => {
                const isEditing = editingIndex === index;
                return isEditing ? (
                    <Input
                        value={editValues.appointment}
                        onChange={(e) => setEditValues((p) => ({ ...p, appointment: e.target.value }))}
                        placeholder="Appointment"
                    />
                ) : (
                    value || "-"
                );
            },
        },
        {
            key: "remarks",
            label: "Remarks",
            render: (value, row, index) => {
                const isEditing = editingIndex === index;
                return isEditing ? (
                    <Input
                        value={editValues.remarks}
                        onChange={(e) => setEditValues((p) => ({ ...p, remarks: e.target.value }))}
                        placeholder="Remarks"
                    />
                ) : (
                    value || "-"
                );
            },
        },
        {
            key: "initials",
            label: "Initials",
            render: (value, row, index) => {
                const isEditing = editingIndex === index;
                return isEditing ? (
                    <Input
                        value={editValues.initials}
                        onChange={(e) => setEditValues((p) => ({ ...p, initials: e.target.value }))}
                        placeholder="Initials"
                    />
                ) : (
                    value || "-"
                );
            },
        },
    ];

    const actions: TableAction<InspFormData>[] = [
        {
            key: "edit-cancel",
            label: editingIndex !== null ? "Cancel" : "Edit",
            variant: editingIndex !== null ? "outline" : "outline",
            size: "sm",
            handler: (row, index) => {
                if (editingIndex === index) {
                    cancelEdit();
                } else {
                    startEdit(index);
                }
            },
            condition: () => true,
        },
        {
            key: "save-delete",
            label: editingIndex !== null ? "Save" : "Delete",
            variant: editingIndex !== null ? "default" : "destructive",
            size: "sm",
            className: editingIndex !== null ? "bg-green-600" : "",
            handler: (row, index) => {
                if (editingIndex === index) {
                    saveEdit(index);
                } else {
                    onDelete(index);
                }
            },
            condition: () => true,
        },
    ];

    const config: TableConfig<InspFormData> = {
        columns,
        actions,
        features: {
            sorting: false,
            filtering: false,
            pagination: false,
            selection: false,
            search: false,
        },
        styling: {
            compact: false,
            bordered: true,
            striped: false,
            hover: false,
        },
        theme:{
            variant: "blue"
        },
        emptyState: {
            message: "No saved inspections.",
        },
        loading: false,
    };

    if (data.length === 0) {
        return null;
    }

    return (
        <div className="mb-6">
            <UniversalTable<InspFormData>
                data={data}
                config={config}
            />
        </div>
    );
}
