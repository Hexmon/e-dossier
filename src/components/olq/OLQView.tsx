"use client";

import React from "react";
import { OlqSubtitle } from "@/types/olq";
import { GRADE_BRACKETS } from "@/constants/app.constants";

interface Props {
    structure: Record<string, readonly OlqSubtitle[]>;
    submission: { marks: Record<string, number>; total: number; bracketKey: string } | null;

    onEdit: () => void;
    onDeleteSemester: () => void;
}

export default function OLQView({ structure, submission, onEdit, onDeleteSemester }: Props) {
    if (!submission) {
        return <p className="text-center py-6 text-muted-foreground">No submission for this semester.</p>;
    }

    return (
        <div className="space-y-4">
            {/* ACTION BUTTONS */}
            <div className="flex justify-end gap-4">
                <button
                    onClick={onEdit}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Edit
                </button>

                <button
                    onClick={onDeleteSemester}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    Delete Semester
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-[850px] border-collapse">
                    <thead>
                        <tr>
                            <th className="border p-2 bg-gray-100">Attribute</th>
                            {GRADE_BRACKETS.map((b) => (
                                <th key={b.key} className="border p-2 bg-gray-50">
                                    <div className="font-semibold">{b.label}</div>
                                    <div className="text-xs">{b.rangeLabel}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {Object.entries(structure).map(([section, items]) => (
                            <React.Fragment key={section}>
                                <tr>
                                    <td
                                        colSpan={GRADE_BRACKETS.length + 1}
                                        className="border p-2 bg-blue-50 font-semibold text-center"
                                    >
                                        {section}
                                    </td>
                                </tr>

                                {items.map((attr) => {
                                    const val = submission.marks[attr.id] ?? 0;

                                    return (
                                        <tr key={attr.id}>
                                            <td className="border p-2 bg-white font-medium">{attr.name}</td>

                                            {GRADE_BRACKETS.map((b) => (
                                                <td
                                                    key={b.key}
                                                    className={`border p-2 text-center ${submission.bracketKey === b.key ? "bg-yellow-50" : ""
                                                        }`}
                                                >
                                                    {submission.bracketKey === b.key ? val : ""}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </React.Fragment>
                        ))}

                        <tr className="bg-gray-50">
                            <td className="border p-2 font-semibold">TOTAL</td>

                            {GRADE_BRACKETS.map((b) => (
                                <td
                                    key={b.key}
                                    className={`border p-2 text-center ${submission.bracketKey === b.key ? "bg-yellow-100" : ""
                                        }`}
                                >
                                    {submission.bracketKey === b.key && (
                                        <>
                                            <div className="font-bold">{submission.total}</div>
                                            <div className="text-xs">{b.label}</div>
                                        </>
                                    )}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
