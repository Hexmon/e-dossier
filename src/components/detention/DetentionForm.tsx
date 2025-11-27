"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    FieldArrayWithId,
    UseFieldArrayAppend,
    UseFieldArrayRemove,
    UseFormRegister,
} from "react-hook-form";
import {  DetentionFormValues, DetentionRow } from "@/types/detention";

interface Props {
    register: UseFormRegister<DetentionFormValues>;
    fields: FieldArrayWithId<DetentionFormValues, "detentionRows", "id">[];
    append: UseFieldArrayAppend<DetentionFormValues, "detentionRows">;
    remove: UseFieldArrayRemove;

    savedRows: DetentionRow[];
    onEditRow: (row: DetentionRow) => void;
    onDeleteSaved: (i: number) => void;

    editingRowId: string | null;
    editingValues: Partial<DetentionRow> | null;
    setEditingField: (field: keyof DetentionRow, value: any) => void;
    saveInlineEdit: (i: number) => void;
    cancelInlineEdit: () => void;

    onSubmit: any;
    onReset: any;
}

export default function DetentionForm({
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
    return (
        <div className="space-y-6">

            {/* Saved Table */}
            <div className="overflow-x-auto border rounded-lg shadow mb-6">
                {savedRows.length === 0 ? (
                    <p className="text-center p-4 text-gray-500">No detention records.</p>
                ) : (
                    <table className="w-full border text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-2 border text-center">S No</th>
                                <th className="p-2 border">Reason</th>
                                <th className="p-2 border">From</th>
                                <th className="p-2 border">To</th>
                                <th className="p-2 border">Remark</th>
                                <th className="p-2 border text-center">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {savedRows.map((row, i) => {
                                const isEditing = editingRowId === row.id;

                                return (
                                    <tr key={row.id}>
                                        <td className="p-2 border text-center">{i + 1}</td>

                                        <td className="p-2 border">
                                            {isEditing ? (
                                                <Input
                                                    value={editingValues?.reason ?? ""}
                                                    onChange={(e) => setEditingField("reason", e.target.value)}
                                                />
                                            ) : (
                                                row.reason
                                            )}
                                        </td>

                                        <td className="p-2 border">
                                            {isEditing ? (
                                                <Input
                                                    type="date"
                                                    value={editingValues?.dateFrom ?? ""}
                                                    onChange={(e) => setEditingField("dateFrom", e.target.value)}
                                                />
                                            ) : (
                                                row.dateFrom
                                            )}
                                        </td>

                                        <td className="p-2 border">
                                            {isEditing ? (
                                                <Input
                                                    type="date"
                                                    value={editingValues?.dateTo ?? ""}
                                                    onChange={(e) => setEditingField("dateTo", e.target.value)}
                                                />
                                            ) : (
                                                row.dateTo
                                            )}
                                        </td>

                                        <td className="p-2 border">
                                            {isEditing ? (
                                                <Input
                                                    value={editingValues?.remark ?? ""}
                                                    onChange={(e) => setEditingField("remark", e.target.value)}
                                                />
                                            ) : (
                                                row.remark
                                            )}
                                        </td>

                                        <td className="p-2 border text-center">
                                            {isEditing ? (
                                                <>
                                                    <Button onClick={() => saveInlineEdit(i)}>Save</Button>
                                                    <Button variant="outline" onClick={cancelInlineEdit}>Cancel</Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button onClick={() => onEditRow(row)}>Edit</Button>
                                                    <Button variant="destructive" onClick={() => onDeleteSaved(i)}>Delete</Button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* New entries */}
            <form onSubmit={onSubmit}>
                <table className="w-full border text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border">S No</th>
                            <th className="p-2 border">Reason</th>
                            <th className="p-2 border">From</th>
                            <th className="p-2 border">To</th>
                            <th className="p-2 border">Remark</th>
                            <th className="p-2 border">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fields.map((field, i) => (
                            <tr key={field.id}>
                                <td className="p-2 border">{i + 1}</td>
                                <td className="p-2 border">
                                    <Input {...register(`detentionRows.${i}.reason`)} />
                                </td>
                                <td className="p-2 border">
                                    <Input type="date" {...register(`detentionRows.${i}.dateFrom`)} />
                                </td>
                                <td className="p-2 border">
                                    <Input type="date" {...register(`detentionRows.${i}.dateTo`)} />
                                </td>
                                <td className="p-2 border">
                                    <Input {...register(`detentionRows.${i}.remark`)} />
                                </td>
                                <td className="p-2 border text-center">
                                    <Button variant="destructive" onClick={() => remove(i)}>Remove</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex justify-center gap-4 mt-4">
                    <Button
                        type="button"
                        onClick={() =>
                            append({
                                id: null,
                                semester: 1,
                                reason: "",
                                type: "DETENTION",
                                dateFrom: "",
                                dateTo: "",
                                remark: "",
                            })
                        }
                    >
                        + Add Row
                    </Button>

                    <Button type="submit" className="bg-green-600">Submit</Button>
                    <Button type="button" variant="outline" onClick={onReset}>
                        Reset
                    </Button>
                </div>
            </form>
        </div>
    );
}
