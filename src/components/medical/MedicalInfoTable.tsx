"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MedInfoRow } from "@/types/med-records";
import { UniversalTable, TableColumn, TableAction, TableConfig } from "@/components/layout/TableLayout";

interface Props {
    rows: MedInfoRow[];
    semesters: string[];
    activeTab: number;
    loading: boolean;
    editingId: string | null;
    editForm: MedInfoRow | null;

    onEdit: (row: MedInfoRow) => void;
    onChange: (field: keyof MedInfoRow, value: any) => void;
    onSave: () => void;
    onCancel: () => void;
    onDelete: (row: MedInfoRow) => void;
}

export default function MedicalInfoTable({
    rows,
    semesters,
    activeTab,
    loading,
    editingId,
    editForm,
    onEdit,
    onChange,
    onSave,
    onCancel,
    onDelete
}: Props) {
    const filtered = rows.filter((r) => r.term === semesters[activeTab]);

    const columns: TableColumn<MedInfoRow>[] = [
        {
            key: "date",
            label: "Date",
            type: "date",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        type="date"
                        value={editForm?.date ?? ""}
                        onChange={(e) => onChange("date", e.target.value)}
                    />
                ) : value;
            }
        },
        {
            key: "age",
            label: "Age",
            type: "number",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={editForm?.age ?? ""}
                        onChange={(e) => onChange("age", e.target.value)}
                    />
                ) : value;
            }
        },
        {
            key: "height",
            label: "Height",
            type: "number",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={editForm?.height ?? ""}
                        onChange={(e) => onChange("height", e.target.value)}
                    />
                ) : value;
            }
        },
        {
            key: "ibw",
            label: "IBW",
            type: "number",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={editForm?.ibw ?? ""}
                        onChange={(e) => onChange("ibw", e.target.value)}
                    />
                ) : value;
            }
        },
        {
            key: "abw",
            label: "ABW",
            type: "number",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={editForm?.abw ?? ""}
                        onChange={(e) => onChange("abw", e.target.value)}
                    />
                ) : value;
            }
        },
        {
            key: "overw",
            label: "Overwt",
            type: "number",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={editForm?.overw ?? ""}
                        onChange={(e) => onChange("overw", e.target.value)}
                    />
                ) : value;
            }
        },
        {
            key: "bmi",
            label: "BMI",
            type: "number",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={editForm?.bmi ?? ""}
                        onChange={(e) => onChange("bmi", e.target.value)}
                    />
                ) : value;
            }
        },
        {
            key: "chest",
            label: "Chest",
            type: "number",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={editForm?.chest ?? ""}
                        onChange={(e) => onChange("chest", e.target.value)}
                    />
                ) : value;
            }
        }
    ];

    const actions: TableAction<MedInfoRow>[] = [
        {
            key: "edit-cancel",
            label: editingId ? "Cancel" : "Edit",
            variant: editingId ? "outline" : "outline",
            size: "sm",
            handler: (row) => {
                if (editingId === row.id) {
                    onCancel();
                } else {
                    onEdit(row);
                }
            }
        },
        {
            key: "save-delete",
            label: editingId ? "Save" : "Delete",
            variant: editingId ? "default" : "destructive",
            size: "sm",
            handler: (row) => {
                if (editingId === row.id) {
                    onSave();
                } else {
                    onDelete(row);
                }
            }
        }
    ];

    const config: TableConfig<MedInfoRow> = {
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
            message: filtered.length === 0 ? "No records yet." : "No data found"
        },
        loading
    };

    return (
        <div className="mb-6">
            <UniversalTable<MedInfoRow>
                data={filtered}
                config={config}
            />
        </div>
    );
}
