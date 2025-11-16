"use client";

import { Input } from "@/components/ui/input";
import { Row as SemesterRow } from "@/types/sportsAwards";

interface Props {
    title: string;
    termKey: string;
    rows: SemesterRow[];
    savedRows: SemesterRow[];
    register: any;
}

export default function SportsGamesTable({
    title,
    termKey,
    rows,
    savedRows,
    register,
}: Props) {
    return (
        <div className="mb-10">

            <h2 className="font-semibold text-md mb-2 underline">{title}</h2>

            {/* Saved Table */}
            <div className="overflow-x-auto border rounded-lg shadow mb-4">
                {savedRows.length === 0 ? (
                    <p className="text-center p-4 text-gray-500">
                        No data submitted yet.
                    </p>
                ) : (
                    <table className="w-full border text-sm">
                        <thead className="bg-gray-100 text-left">
                            <tr>
                                <th className="p-2 border">Games / Awards</th>
                                <th className="p-2 border">String</th>
                                <th className="p-2 border">Max Marks</th>
                                <th className="p-2 border">Obtained</th>
                            </tr>
                        </thead>
                        <tbody>
                            {savedRows.map((row, i) => (
                                <tr key={i}>
                                    <td className="p-2 border">{row.activity}</td>
                                    <td className="p-2 border">{row.string || "-"}</td>
                                    <td className="p-2 border">{row.maxMarks || "-"}</td>
                                    <td className="p-2 border">{row.obtained || "-"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Input Table */}
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
                        {rows.map((row, index) => (
                            <tr key={index}>
                                <td className="p-2 border">{row.activity}</td>

                                <td className="p-2 border">
                                    <Input
                                        {...register(`${termKey}.${index}.string`)}
                                        defaultValue={row.string}
                                    />
                                </td>

                                <td className="p-2 border">
                                    <Input
                                        {...register(`${termKey}.${index}.maxMarks`)}
                                        type="number"
                                        defaultValue={row.maxMarks}
                                    />
                                </td>

                                <td className="p-2 border">
                                    <Input
                                        {...register(`${termKey}.${index}.obtained`)}
                                        type="number"
                                        defaultValue={row.obtained}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </div>
    );
}
