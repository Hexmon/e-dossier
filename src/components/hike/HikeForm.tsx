"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UniversalTable, TableColumn, TableAction, TableConfig } from "@/components/layout/TableLayout";
import {
    UseFormRegister,
    FieldArrayWithId,
    UseFieldArrayAppend,
    UseFieldArrayRemove,
} from "react-hook-form";
import { HikeFormValues, HikeRow } from "@/types/hike";

interface Props {
    register: UseFormRegister<HikeFormValues>;
    fields: FieldArrayWithId<HikeFormValues, "hikeRows", "id">[];
    append: UseFieldArrayAppend<HikeFormValues, "hikeRows">;
    remove: UseFieldArrayRemove;

    savedRows: HikeRow[];
    onEditRow: (row: HikeRow) => void;
    onDeleteSaved: (i: number) => void;
    editingRowId: string | null;
    editingValues: Partial<HikeRow> | null;
    setEditingField: <K extends keyof HikeRow>(field: K, value: HikeRow[K]) => void;
    saveInlineEdit: (index: number) => void;
    cancelInlineEdit: () => void;

    onSubmit: (e?: React.BaseSyntheticEvent) => void;
    onReset: () => void;
}

export default function HikeForm({
    register,
    fields,
    append,
    remove,

    savedRows,
    onEditRow,
    onDeleteSaved,
    editingRowId,
    editingValues,
    setEditingField,
    saveInlineEdit,
    cancelInlineEdit,

    onSubmit,
    onReset,
}: Props) {
    // Saved rows table columns
    const savedColumns: TableColumn<HikeRow>[] = [
        {
            key: "sno",
            label: "S No",
            render: (value, row, index) => (
                <Input
                    value={String(index + 1)}
                    disabled
                    className="bg-gray-100 text-center"
                />
            )
        },
        {
            key: "reason",
            label: "Hike Detls / Reason",
            render: (value, row) => {
                const isEditing = editingRowId === row.id;
                return isEditing ? (
                    <Input
                        value={editingValues?.reason ?? ""}
                        onChange={(e) => setEditingField("reason", e.target.value)}
                    />
                ) : (
                    <div>{row.reason}</div>
                );
            }
        },
        {
            key: "dateFrom",
            label: "From",
            type: "date",
            render: (value, row) => {
                const isEditing = editingRowId === row.id;
                return isEditing ? (
                    <Input
                        type="date"
                        value={editingValues?.dateFrom ?? ""}
                        onChange={(e) => setEditingField("dateFrom", e.target.value)}
                    />
                ) : (
                    <div>{row.dateFrom}</div>
                );
            }
        },
        {
            key: "dateTo",
            label: "To",
            type: "date",
            render: (value, row) => {
                const isEditing = editingRowId === row.id;
                return isEditing ? (
                    <Input
                        type="date"
                        value={editingValues?.dateTo ?? ""}
                        onChange={(e) => setEditingField("dateTo", e.target.value)}
                    />
                ) : (
                    <div>{row.dateTo}</div>
                );
            }
        },
        {
            key: "remark",
            label: "Remarks",
            render: (value, row) => {
                const isEditing = editingRowId === row.id;
                return isEditing ? (
                    <Input
                        value={editingValues?.remark ?? ""}
                        onChange={(e) => setEditingField("remark", e.target.value)}
                    />
                ) : (
                    <div>{row.remark}</div>
                );
            }
        }
    ];

    const savedActions: TableAction<HikeRow>[] = [
        {
            key: "edit-cancel",
            label: editingRowId ? "Cancel" : "Edit",
            variant: editingRowId ? "outline" : "default",
            size: "sm",
            handler: (row, index) => {
                if (editingRowId === row.id) {
                    cancelInlineEdit();
                } else {
                    onEditRow(row);
                }
            }
        },
        {
            key: "save-delete",
            label: editingRowId ? "Save" : "Delete",
            variant: editingRowId ? "default" : "destructive",
            size: "sm",
            handler: (row, index) => {
                if (editingRowId === row.id) {
                    saveInlineEdit(index);
                } else {
                    onDeleteSaved(index);
                }
            }
        }
    ];

    const savedConfig: TableConfig<HikeRow> = {
        columns: savedColumns,
        actions: savedActions,
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
            message: "No saved records for this term."
        }
    };

    // New entry table columns
    const newEntryColumns: TableColumn<FieldArrayWithId<HikeFormValues, "hikeRows", "id">>[] = [
        {
            key: "sno",
            label: "S No",
            render: (value, row, index) => (
                <Input
                    value={String(index + 1)}
                    disabled
                    className="bg-gray-100 text-center"
                />
            )
        },
        {
            key: "reason",
            label: "Hike Detls / Reason",
            render: (value, row, index) => (
                <Input {...register(`hikeRows.${index}.reason`)} />
            )
        },
        {
            key: "dateFrom",
            label: "From",
            type: "date",
            render: (value, row, index) => (
                <Input type="date" {...register(`hikeRows.${index}.dateFrom`)} />
            )
        },
        {
            key: "dateTo",
            label: "To",
            type: "date",
            render: (value, row, index) => (
                <Input type="date" {...register(`hikeRows.${index}.dateTo`)} />
            )
        },
        {
            key: "remark",
            label: "Remarks",
            render: (value, row, index) => (
                <Input {...register(`hikeRows.${index}.remark`)} />
            )
        }
    ];

    const newEntryActions: TableAction<FieldArrayWithId<HikeFormValues, "hikeRows", "id">>[] = [
        {
            key: "remove",
            label: "Remove",
            variant: "destructive",
            size: "sm",
            handler: (row, index) => {
                remove(index);
            }
        }
    ];

    const newEntryConfig: TableConfig<FieldArrayWithId<HikeFormValues, "hikeRows", "id">> = {
        columns: newEntryColumns,
        actions: newEntryActions,
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
        <div className="space-y-6">
            {/* Saved */}
            <div className="border rounded-lg shadow mb-6">
                <UniversalTable<HikeRow>
                    data={savedRows}
                    config={savedConfig}
                />
            </div>

            {/* New entries */}
            <form onSubmit={onSubmit ?? ((e) => e.preventDefault())}>
                <div className="border rounded-lg shadow">
                    <UniversalTable<FieldArrayWithId<HikeFormValues, "hikeRows", "id">>
                        data={fields}
                        config={newEntryConfig}
                    />
                </div>

                <div className="mt-4 flex justify-center gap-4">
                    <Button type="button" onClick={() => append({ id: null, semester: 1, reason: "", type: "HIKE", dateFrom: "", dateTo: "", remark: "" })}>
                        + Add Row
                    </Button>

                    <Button type="submit" className="bg-green-600 hover:bg-green-700">Submit</Button>

                    <Button type="button" variant="outline" onClick={onReset}>Reset</Button>
                </div>
            </form>
        </div>
    );
}
