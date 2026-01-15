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
                <table className="w-full border-collapse text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border text-center font-semibold">Games / Awards</th>
                            {!hideStringAndMaxMarks && (
                                <>
                                    <th className="p-2 border text-center font-semibold">String</th>
                                    <th className="p-2 border text-center font-semibold">Max Marks</th>
                                </>
                            )}
                            <th className="p-2 border text-center font-semibold">Obtained</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                                <td className="p-2 border">
                                    {row.activity ?? "-"}
                                </td>

                                {!hideStringAndMaxMarks && (
                                    <>
                                        <td className="p-2 border">
                                            <Controller
                                                name={`${termKey}.${index}.string` as any}
                                                control={control}
                                                render={({ field }) => (
                                                    <Input
                                                        {...field}
                                                        value={field.value ?? ""}
                                                        onChange={(e) => field.onChange(e.target.value)}
                                                        disabled={disabled}
                                                        className="w-full"
                                                    />
                                                )}
                                            />
                                        </td>

                                        <td className="p-2 border">
                                            <Controller
                                                name={`${termKey}.${index}.maxMarks` as any}
                                                control={control}
                                                render={({ field }) => (
                                                    <Input
                                                        {...field}
                                                        type="number"
                                                        value={field.value ?? ""}
                                                        onChange={(e) => field.onChange(e.target.value)}
                                                        disabled={disabled}
                                                        className="w-full"
                                                    />
                                                )}
                                            />
                                        </td>
                                    </>
                                )}

                                <td className="p-2 border">
                                    <Controller
                                        name={`${termKey}.${index}.obtained` as any}
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                {...field}
                                                type="number"
                                                value={field.value ?? ""}
                                                onChange={(e) => field.onChange(e.target.value)}
                                                disabled={disabled}
                                                className="w-full"
                                            />
                                        )}
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