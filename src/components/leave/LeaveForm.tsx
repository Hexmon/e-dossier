"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    UseFormRegister,
    FieldArrayWithId,
    UseFieldArrayAppend,
    UseFieldArrayRemove,
} from "react-hook-form";
import { LeaveFormValues, LeaveRow } from "@/types/lve";

interface Props {
    register: UseFormRegister<LeaveFormValues>;
    fields: FieldArrayWithId<LeaveFormValues, "leaveRows", "id">[];
    append: UseFieldArrayAppend<LeaveFormValues, "leaveRows">;
    remove: UseFieldArrayRemove;

    savedRows: LeaveRow[];
    onEditRow: (row: LeaveRow) => void;
    onDeleteSaved: (i: number) => void;
    editingRowId: string | null;
    editingValues: Partial<LeaveRow> | null;
    setEditingField: <K extends keyof LeaveRow>(field: K, value: LeaveRow[K]) => void;
    saveInlineEdit: (index: number) => void;
    cancelInlineEdit: () => void;

    onSubmit: (e?: React.BaseSyntheticEvent) => void;
    onReset: () => void;
}

export default function LeaveForm({
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
            {/* ---------------- SAVED DATA TABLE ---------------- */}
            <div className="overflow-x-auto border rounded-lg shadow mb-6">
                {savedRows.length === 0 ? (
                    <p className="text-center p-4 text-gray-500">
                        No saved records for this term.
                    </p>
                ) : (
                    <table className="w-full border text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-2 border text-center">S No</th>
                                <th className="p-2 border">Lve Detls / Reason</th>
                                <th className="p-2 border">From</th>
                                <th className="p-2 border">To</th>
                                <th className="p-2 border">Remarks</th>
                                <th className="p-2 border text-center">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {savedRows.map((row, i) => {
                                const { id } = row;
                                const isEditing = editingRowId === id;

                                return (
                                    <tr key={id}>
                                        <td className="p-2 border text-center">
                                            <Input
                                                value={String(i + 1)}
                                                disabled
                                                className="bg-gray-100 text-center"
                                            />
                                        </td>

                                        {/* Reason */}
                                        <td className="p-2 border">
                                            {isEditing ? (
                                                <Input
                                                    value={editingValues?.reason ?? ""}
                                                    onChange={(e) =>
                                                        setEditingField("reason", e.target.value)
                                                    }
                                                />
                                            ) : (
                                                <div>{row.reason}</div>
                                            )}
                                        </td>

                                        {/* From */}
                                        <td className="p-2 border">
                                            {isEditing ? (
                                                <Input
                                                    type="date"
                                                    value={editingValues?.dateFrom ?? ""}
                                                    onChange={(e) =>
                                                        setEditingField("dateFrom", e.target.value)
                                                    }
                                                />
                                            ) : (
                                                <div>{row.dateFrom}</div>
                                            )}
                                        </td>

                                        {/* To */}
                                        <td className="p-2 border">
                                            {isEditing ? (
                                                <Input
                                                    type="date"
                                                    value={editingValues?.dateTo ?? ""}
                                                    onChange={(e) =>
                                                        setEditingField("dateTo", e.target.value)
                                                    }
                                                />
                                            ) : (
                                                <div>{row.dateTo}</div>
                                            )}
                                        </td>

                                        {/* Remarks */}
                                        <td className="p-2 border">
                                            {isEditing ? (
                                                <Input
                                                    value={editingValues?.remark ?? ""}
                                                    onChange={(e) =>
                                                        setEditingField("remark", e.target.value)
                                                    }
                                                />
                                            ) : (
                                                <div>{row.remark}</div>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="p-2 border text-center">
                                            {isEditing ? (
                                                <div className="flex justify-center gap-2">
                                                    <Button size="sm" onClick={() => saveInlineEdit(i)}>
                                                        Save
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={cancelInlineEdit}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-center gap-2">
                                                    <Button size="sm" onClick={() => onEditRow(row)}>
                                                        Edit
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => onDeleteSaved(i)}
                                                    >
                                                        Delete
                                                    </Button>
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

            {/* ---------------- NEW ENTRY TABLE ---------------- */}
            <form onSubmit={onSubmit ?? ((e) => e.preventDefault())}>
                <div className="overflow-x-auto border rounded-lg shadow">
                    <table className="w-full border text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-2 border text-center">S No</th>
                                <th className="p-2 border">Lve Detls / Reason</th>
                                <th className="p-2 border">From</th>
                                <th className="p-2 border">To</th>
                                <th className="p-2 border">Remarks</th>
                                <th className="p-2 border text-center">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {fields.map((field, i) => {
                                const { id } = field;
                                return (
                                    <tr key={id}>
                                        <td className="p-2 border text-center">
                                            <Input
                                                value={String(i + 1)}
                                                disabled
                                                className="bg-gray-100 text-center"
                                            />
                                        </td>

                                        <td className="p-2 border">
                                            <Input {...register(`leaveRows.${i}.reason`)} />
                                        </td>

                                        <td className="p-2 border">
                                            <Input type="date" {...register(`leaveRows.${i}.dateFrom`)} />
                                        </td>

                                        <td className="p-2 border">
                                            <Input type="date" {...register(`leaveRows.${i}.dateTo`)} />
                                        </td>

                                        <td className="p-2 border">
                                            <Input {...register(`leaveRows.${i}.remark`)} />
                                        </td>

                                        <td className="p-2 border text-center">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => remove(i)}
                                            >
                                                Remove
                                            </Button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 flex justify-center gap-4">
                    <Button
                        type="button"
                        onClick={() =>
                            append({
                                id: null,
                                semester: 1,
                                reason: "",
                                type: "LEAVE",
                                dateFrom: "",
                                dateTo: "",
                                remark: "",
                            })
                        }
                    >
                        + Add Row
                    </Button>

                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                        Submit
                    </Button>

                    <Button type="button" variant="outline" onClick={onReset}>
                        Reset
                    </Button>
                </div>
            </form>
        </div>
    );
}
