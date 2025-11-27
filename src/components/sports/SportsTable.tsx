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
}

export default function SportsGamesTable({
    title,
    termKey,
    rows,
    savedRows,
    register,
    disabled = false,
}: Props) {

    return (
        <div className="mb-10">
            <h2 className="font-semibold text-md mb-2 underline">{title}</h2>

            {/* Saved rows removed — backend values are shown in the editable inputs below via form reset */}

            {/* ==================== INPUT TABLE ==================== */}
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
                                        disabled={disabled}
                                    />
                                </td>

                                <td className="p-2 border">
                                    <Input
                                        {...register(`${termKey}.${index}.maxMarks`)}
                                        type="number"
                                        defaultValue={row.maxMarks}
                                        disabled={disabled}
                                    />
                                </td>

                                <td className="p-2 border">
                                    <Input
                                        {...register(`${termKey}.${index}.obtained`)}
                                        type="number"
                                        defaultValue={row.obtained}
                                        disabled={disabled}
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
