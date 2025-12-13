"use client";

import { Input } from "@/components/ui/input";
import { Row as SemesterRow } from "@/types/sportsAwards";
import { Controller } from "react-hook-form";

interface Props {
    title: string;
    termKey: string;
    rows: SemesterRow[];
    savedRows: SemesterRow[];
    control: any;
    disabled?: boolean;
    hideStringAndMaxMarks?: boolean;
}

export default function SportsGamesTable({
    title,
    termKey,
    rows,
    savedRows,
    control,
    disabled = false,
    hideStringAndMaxMarks = false,
}: Props) {
    return (
        <div className="mb-10">
            <h2 className="font-semibold text-md mb-2 underline">{title}</h2>

            <div className="overflow-x-auto border rounded-lg shadow">
                <table className="w-full border text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border">Games / Awards</th>
                            {!hideStringAndMaxMarks && <th className="p-2 border">String</th>}
                            {!hideStringAndMaxMarks && <th className="p-2 border">Max Marks</th>}
                            <th className="p-2 border">Obtained</th>
                        </tr>
                    </thead>

                    <tbody>
                        {rows.map((prefillRow, index) => {
                            const activity = prefillRow.activity ?? "-";

                            return (
                                <tr key={`${termKey}-${index}`}>
                                    <td className="p-2 border">{activity}</td>

                                    {/* STRING - Always Register */}
                                    <td className={hideStringAndMaxMarks ? "hidden" : "p-2 border"}>
                                        <Controller
                                            name={`${termKey}.${index}.string`}
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    {...field}
                                                    disabled={disabled || hideStringAndMaxMarks}
                                                />
                                            )}
                                        />
                                    </td>

                                    {/* MAX MARKS - Always Register */}
                                    <td className={hideStringAndMaxMarks ? "hidden" : "p-2 border"}>
                                        <Controller
                                            name={`${termKey}.${index}.maxMarks`}
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    {...field}
                                                    type="number"
                                                    disabled={disabled || hideStringAndMaxMarks}
                                                />
                                            )}
                                        />
                                    </td>

                                    {/* OBTAINED */}
                                    <td className="p-2 border">
                                        <Controller
                                            name={`${termKey}.${index}.obtained`}
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    {...field}
                                                    type="number"
                                                    disabled={disabled}
                                                />
                                            )}
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
