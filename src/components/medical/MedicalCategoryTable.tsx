"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MedCatRow } from "@/types/med-records";
import { UniversalTable, TableColumn, TableAction, TableConfig } from "@/components/layout/TableLayout";

interface Props {
    rows: MedCatRow[];
    editingId: string | null;
    editForm: MedCatRow | null;

    onEdit: (row: MedCatRow) => void;
    onChange: <K extends keyof MedCatRow>(key: K, value: MedCatRow[K]) => void;
    onSave: () => void;
    onCancel: () => void;
    onDelete: (row: MedCatRow) => void;
}

export default function MedicalCategoryTable({
    rows,
    editingId,
    editForm,
    onEdit,
    onChange,
    onSave,
    onCancel,
    onDelete,
}: Props) {
    const columns: TableColumn<MedCatRow>[] = [
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
                        onChange={(e) => onChange("date", e.target.value as any)}
                        className="h-7 text-xs px-2"
                    />
                ) : value;
            }
        },
        {
            key: "diagnosis",
            label: "Diagnosis",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        type="text"
                        value={editForm?.diagnosis ?? ""}
                        onChange={(e) => onChange("diagnosis", e.target.value as any)}
                        className="h-7 text-xs px-2"
                    />
                ) : value;
            }
        },
        {
            key: "catFrom",
            label: "Cat From",
            type: "date",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        type="date"
                        value={editForm?.catFrom ?? ""}
                        onChange={(e) => onChange("catFrom", e.target.value as any)}
                        className="h-7 text-xs px-2"
                    />
                ) : value;
            }
        },
        {
            key: "catTo",
            label: "Cat To",
            type: "date",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        type="date"
                        value={editForm?.catTo ?? ""}
                        onChange={(e) => onChange("catTo", e.target.value as any)}
                        className="h-7 text-xs px-2"
                    />
                ) : value;
            }
        },
        {
            key: "mhFrom",
            label: "MH From",
            type: "date",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        type="date"
                        value={editForm?.mhFrom ?? ""}
                        onChange={(e) => onChange("mhFrom", e.target.value as any)}
                        className="h-7 text-xs px-2"
                    />
                ) : value;
            }
        },
        {
            key: "mhTo",
            label: "MH To",
            type: "date",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        type="date"
                        value={editForm?.mhTo ?? ""}
                        onChange={(e) => onChange("mhTo", e.target.value as any)}
                        className="h-7 text-xs px-2"
                    />
                ) : value;
            }
        },
        {
            key: "absence",
            label: "Absence",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        type="text"
                        value={editForm?.absence ?? ""}
                        onChange={(e) => onChange("absence", e.target.value as any)}
                        className="h-7 text-xs px-2"
                    />
                ) : value;
            }
        },
        {
            key: "piCdrInitial",
            label: "PI Cdr Initial",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        type="text"
                        value={editForm?.piCdrInitial ?? ""}
                        onChange={(e) => onChange("piCdrInitial", e.target.value as any)}
                        className="h-7 text-xs px-2"
                    />
                ) : value;
            }
        }
    ];

    const actions: TableAction<MedCatRow>[] = [
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

    const config: TableConfig<MedCatRow> = {
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
            message: "No MED CAT records saved."
        }
    };

    return (
        <div className="mb-6">
            <UniversalTable<MedCatRow>
                data={rows}
                config={config}
            />
        </div>
    );
}
