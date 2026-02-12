"use client";

import React from "react";
import { GRADE_BRACKETS } from "@/constants/app.constants";

interface Props {
    structure: Record<string, any[]>;
    submission: { marks: Record<string, number>; total: number; bracketKey: string } | null;
}

export default function OLQView({ structure, submission }: Props) {
    if (!submission) {
        return <p className="text-center py-6 text-muted-foreground">No submission for this semester.</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-[850px] border-collapse">
                <thead>
                    <tr>
                        <th className="border p-2 bg-muted/70">Attribute</th>
                        {GRADE_BRACKETS.map((b) => {
                            const { key } = b;
                            return (
                                <th key={key} className="border p-2 bg-muted/40">
                                    <div className="font-semibold">{b.label}</div>
                                    <div className="text-xs">{b.rangeLabel}</div>
                                </th>
                            )
                        })}
                    </tr>
                </thead>

                <tbody>
                    {Object.entries(structure).map(([section, items]) => {
                        return (
                            <React.Fragment key={section}>
                                <tr>
                                    <td colSpan={GRADE_BRACKETS.length + 1} className="border p-2 bg-primary/10 font-semibold text-center">
                                        {section}
                                    </td>
                                </tr>

                                {items.map((attr: any) => {
                                    const val = submission.marks[attr.id] ?? 0;
                                    return (
                                        <tr key={attr.id}>
                                            <td className="border p-2 bg-card font-medium">{attr.subtitle}</td>

                                            {GRADE_BRACKETS.map((b) => (
                                                <td key={b.key} className={`border p-2 text-center ${submission.bracketKey === b.key ? "bg-warning/20" : ""}`}>
                                                    {submission.bracketKey === b.key ? val : ""}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </React.Fragment>
                        )
                    })}

                    <tr className="bg-muted/40">
                        <td className="border p-2 font-semibold">TOTAL</td>

                        {GRADE_BRACKETS.map((b) => {
                            const { key } = b;
                            return (
                                <td key={key} className={`border p-2 text-center ${submission.bracketKey === b.key ? "bg-warning/20" : ""}`}>
                                    {submission.bracketKey === b.key && (
                                        <>
                                            <div className="font-bold">{submission.total}</div>
                                            <div className="text-xs">{b.label}</div>
                                        </>
                                    )}
                                </td>
                            )
                        })}
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
