"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MedCatRow } from "@/types/med-records";

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
    if (!rows || rows.length === 0) {
        return <p className="text-center text-gray-500">No MED CAT records saved.</p>;
    }

    return (
        <div className="overflow-x-auto mb-6 border rounded-lg shadow">
            <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                    <tr>
                        {[
                            "Date",
                            "Diagnosis",
                            "Cat From",
                            "Cat To",
                            "MH From",
                            "MH To",
                            "Absence",
                            "PI Cdr Initial",
                            "Action",
                        ].map((h) => (
                            <th key={h} className="border p-2 text-center">{h}</th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {rows.map((row) => {
                        const {
                            id = "",
                            date = "",
                            diagnosis = "",
                            catFrom = "",
                            catTo = "",
                            mhFrom = "",
                            mhTo = "",
                            absence = "",
                            piCdrInitial = "",
                        } = row;

                        const isEditing = editingId === id;

                        return (
                            <tr key={id}>
                                {[
                                    ["date", date],
                                    ["diagnosis", diagnosis],
                                    ["catFrom", catFrom],
                                    ["catTo", catTo],
                                    ["mhFrom", mhFrom],
                                    ["mhTo", mhTo],
                                    ["absence", absence],
                                    ["piCdrInitial", piCdrInitial],
                                ].map(([key, val]) => (
                                    <td key={key as string} className="border p-2 text-center">
                                        {isEditing ? (
                                            <Input
                                                type={
                                                    ["date", "catFrom", "catTo", "mhFrom", "mhTo"].includes(key as string)
                                                        ? "date"
                                                        : "text"
                                                }
                                                value={(editForm as any)?.[key as string] ?? ""}
                                                onChange={(e) => onChange(key as any, e.target.value)}
                                                className="h-7 text-xs px-2"
                                            />
                                        ) : (
                                            val
                                        )}
                                    </td>
                                ))}

                                <td className="border p-2 text-center space-x-2">
                                    {!isEditing ? (
                                        <>
                                            <Button size="sm" variant="outline" onClick={() => onEdit(row)}>
                                                Edit
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => onDelete(row)}>
                                                Delete
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button size="sm" onClick={onSave}>
                                                Save
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={onCancel}>
                                                Cancel
                                            </Button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
