"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UniversalTable, TableColumn, TableAction, TableConfig } from "@/components/layout/TableLayout";
import { toast } from "sonner";

import type { InspFormData } from "@/types/dossierInsp";
import { useUsers } from "@/hooks/useUsers";
import { useAppointments } from "@/hooks/useAppointments";
import { Card, CardTitle } from "../ui/card";

interface InspTableProps {
    data: InspFormData[];
    onDelete: (index: number) => void;
    onUpdate?: (index: number, updatedRow: InspFormData) => void;
}

export default function InspTable({ data, onDelete, onUpdate }: InspTableProps) {
    const { users } = useUsers();
    const { appointments, fetchAppointments } = useAppointments();

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

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
                    value ? new Date(value).toLocaleDateString('en-GB') : "-"
                );
            },
        },
        {
            key: "name",
            label: "Name",
            render: (value, row, index) => {
                const isEditing = editingIndex === index;
                return isEditing ? (
                    <Select
                        value={editValues.name}
                        onValueChange={(val) => {
                            setEditValues((p) => ({ ...p, name: val }));
                            const user = users.find(u => u.name === val);
                            if (user) {
                                const app = appointments.find(a => a.userId === user.id);
                                setEditValues((p) => ({
                                    ...p,
                                    rk: user.rank || '',
                                    initials: `${user.rank} ${user.name}` || '',
                                    appointment: app?.positionName || ''
                                }));
                            }
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select Inspector" />
                        </SelectTrigger>
                        <SelectContent>
                            {users.map((user) => (
                                <SelectItem key={user.id} value={user.name}>
                                    {user.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
                        disabled
                        placeholder="Rank"
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
                        disabled
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
                        disabled
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
        theme: {
            variant: "default"
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

                <CardTitle className="text-2xl text-center font-semibold mb-4">Inspection Records</CardTitle>

                <UniversalTable<InspFormData>
                    data={data}
                    config={config}
                />


            </div>
        
    );
}
