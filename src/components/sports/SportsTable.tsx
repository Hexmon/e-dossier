"use client";

import { Input } from "@/components/ui/input";
import { Row as SemesterRow } from "@/types/sportsAwards";

interface Props {
    title: string;
    termKey: string;
    rows: SemesterRow[];
    savedRows: SemesterRow[];
    register: any;
    disabled?: boolean;
    onRowUpdated?: (row: SemesterRow, index: number) => void;
}

export default function SportsGamesTable({
    title,
    termKey,
    rows,
    savedRows,
    register,
    disabled = false,
    onRowUpdated,
}: Props) {
    return (
        <div className="mb-10">
            <h2 className="font-semibold text-md mb-2 underline">{title}</h2>

            <div className="overflow-x-auto border rounded-lg shadow">
                <table className="w-full border text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border">Games / Awards</th>
                            <th className="p-2 border">String</th>
                            <th className="p-2 border">Max Marks</th>
                            <th className="p-2 border">Obtained</th>
                        </tr>
                    </thead>

                    <tbody>
                        {rows.map((prefillRow, index) => {
                            const saved = savedRows[index] ?? {};
                            const row: SemesterRow = {
                                ...prefillRow,
                                ...saved,
                                activity: saved.activity ?? prefillRow.activity,
                                string: saved.string ?? prefillRow.string ?? "",
                                maxMarks:
                                    saved.maxMarks ??
                                    prefillRow.maxMarks ??
                                    "",
                                obtained:
                                    saved.obtained ??
                                    prefillRow.obtained ??
                                    "",
                            };

                            const stringField = register(`${termKey}.${index}.string`);
                            const maxField = register(`${termKey}.${index}.maxMarks`);
                            const obtainedField = register(`${termKey}.${index}.obtained`);

                            return (
                                <tr key={index}>
                                    <td className="p-2 border">{row.activity ?? "-"}</td>

                                    {/* STRING */}
                                    <td className="p-2 border">
                                        <Input
                                            {...stringField}
                                            defaultValue={row.string}
                                            disabled={disabled}
                                            onChange={(e) => {
                                                stringField.onChange(e);
                                                onRowUpdated?.(
                                                    { ...row, string: e.target.value },
                                                    index
                                                );
                                            }}
                                        />
                                    </td>

                                    {/* MAX MARKS */}
                                    <td className="p-2 border">
                                        <Input
                                            {...maxField}
                                            type="number"
                                            defaultValue={row.maxMarks}
                                            disabled={disabled}
                                            onChange={(e) => {
                                                maxField.onChange(e);
                                                onRowUpdated?.(
                                                    { ...row, maxMarks: e.target.value },
                                                    index
                                                );
                                            }}
                                        />
                                    </td>

                                    {/* OBTAINED */}
                                    <td className="p-2 border">
                                        <Input
                                            {...obtainedField}
                                            type="number"
                                            defaultValue={row.obtained}
                                            disabled={disabled}
                                            onChange={(e) => {
                                                obtainedField.onChange(e);
                                                onRowUpdated?.(
                                                    { ...row, obtained: e.target.value },
                                                    index
                                                );
                                            }}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}