"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
    setEditingField: (field: keyof HikeRow, value: any) => void;
    saveInlineEdit: (index: number) => void;
    cancelInlineEdit: () => void;

    onSubmit?: (e?: any) => void;
    onReset?: () => void;
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
    return (
        <div className="space-y-6">
            {/* Saved */}
            <div className="overflow-x-auto border rounded-lg shadow mb-6">
                {savedRows.length === 0 ? (
                    <p className="text-center p-4 text-gray-500">No saved records for this term.</p>
                ) : (
                    <table className="w-full border text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-2 border text-center">S No</th>
                                <th className="p-2 border">Hike Detls / Reason</th>
                                <th className="p-2 border">From</th>
                                <th className="p-2 border">To</th>
                                <th className="p-2 border">Remarks</th>
                                <th className="p-2 border text-center">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {savedRows.map((row, i) => {
                                const isEditing = editingRowId === row.id;
                                return (
                                    <tr key={row.id ?? i}>
                                        <td className="p-2 border text-center">
                                            <Input value={String(i + 1)} disabled className="bg-gray-100 text-center" />
                                        </td>

                                        <td className="p-2 border">
                                            {isEditing ? (
                                                <Input value={editingValues?.reason ?? ""} onChange={(e) => setEditingField("reason", e.target.value)} />
                                            ) : (
                                                <div>{row.reason}</div>
                                            )}
                                        </td>

                                        <td className="p-2 border">
                                            {isEditing ? (
                                                <Input type="date" value={editingValues?.dateFrom ?? ""} onChange={(e) => setEditingField("dateFrom", e.target.value)} />
                                            ) : (
                                                <div>{row.dateFrom}</div>
                                            )}
                                        </td>

                                        <td className="p-2 border">
                                            {isEditing ? (
                                                <Input type="date" value={editingValues?.dateTo ?? ""} onChange={(e) => setEditingField("dateTo", e.target.value)} />
                                            ) : (
                                                <div>{row.dateTo}</div>
                                            )}
                                        </td>

                                        <td className="p-2 border">
                                            {isEditing ? (
                                                <Input value={editingValues?.remark ?? ""} onChange={(e) => setEditingField("remark", e.target.value)} />
                                            ) : (
                                                <div>{row.remark}</div>
                                            )}
                                        </td>

                                        <td className="p-2 border text-center">
                                            {isEditing ? (
                                                <div className="flex justify-center gap-2">
                                                    <Button size="sm" onClick={() => saveInlineEdit(i)}>Save</Button>
                                                    <Button size="sm" variant="outline" onClick={cancelInlineEdit}>Cancel</Button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-center gap-2">
                                                    <Button size="sm" onClick={() => onEditRow(row)}>Edit</Button>
                                                    <Button size="sm" variant="destructive" onClick={() => onDeleteSaved(i)}>Delete</Button>
                                                </div>
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
            <form onSubmit={onSubmit ?? ((e) => e.preventDefault())}>
                <div className="overflow-x-auto border rounded-lg shadow">
                    <table className="w-full border text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-2 border text-center">S No</th>
                                <th className="p-2 border">Hike Detls / Reason</th>
                                <th className="p-2 border">From</th>
                                <th className="p-2 border">To</th>
                                <th className="p-2 border">Remarks</th>
                                <th className="p-2 border text-center">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {fields.map((field, i) => (
                                <tr key={field.id}>
                                    <td className="p-2 border text-center">
                                        <Input value={String(i + 1)} disabled className="bg-gray-100 text-center" />
                                    </td>

                                    <td className="p-2 border">
                                        <Input {...register(`hikeRows.${i}.reason`)} />
                                    </td>

                                    <td className="p-2 border">
                                        <Input type="date" {...register(`hikeRows.${i}.dateFrom`)} />
                                    </td>

                                    <td className="p-2 border">
                                        <Input type="date" {...register(`hikeRows.${i}.dateTo`)} />
                                    </td>

                                    <td className="p-2 border">
                                        <Input {...register(`hikeRows.${i}.remark`)} />
                                    </td>

                                    <td className="p-2 border text-center">
                                        <Button type="button" size="sm" variant="destructive" onClick={() => remove(i)}>Remove</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
