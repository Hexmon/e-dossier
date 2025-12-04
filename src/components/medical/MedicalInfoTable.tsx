"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MedInfoRow } from "@/types/med-records";

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
    if (loading) return <p className="text-center">Loading...</p>;

    const filtered = rows.filter((r) => r.term === semesters[activeTab]);

    if (filtered.length === 0)
        return <p className="text-center text-gray-500">No records yet.</p>;

    return (
        <div className="overflow-x-auto mb-6 border rounded-lg shadow">
            <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                    <tr>
                        {[
                            "Date", "Age", "Height", "IBW",
                            "ABW", "Overwt", "BMI", "Chest", "Action"
                        ].map((h) => (
                            <th key={h} className="border p-2 text-center">{h}</th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {filtered.map((row) => {
                        const { id = "", date = "", age = "" } = row;
                        const isEditing = editingId === id;

                        return (
                            <tr key={row.id}>
                                <td className="border p-2 text-center">
                                    {isEditing ? (
                                        <Input
                                            type="date"
                                            value={editForm?.date ?? ""}
                                            onChange={(e) => onChange("date", e.target.value)}
                                        />
                                    ) : date}
                                </td>

                                <td className="border p-2 text-center">
                                    {isEditing ? (
                                        <Input
                                            value={editForm?.age ?? ""}
                                            onChange={(e) => onChange("age", e.target.value)}
                                        />
                                    ) : age}
                                </td>

                                {["height", "ibw", "abw", "overw", "bmi", "chest"].map((f) => (
                                    <td key={f} className="border p-2 text-center">
                                        {isEditing ? (
                                            <Input
                                                value={(editForm as any)[f] ?? ""}
                                                onChange={(e) => onChange(f as any, e.target.value)}
                                            />
                                        ) : (row as any)[f]}
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
                                            <Button size="sm" onClick={onSave}>Save</Button>
                                            <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
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
