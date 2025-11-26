"use client";

import React from "react";
import { Input } from "@/components/ui/input";

export type TableRow = {
    id?: string;
    subject: string;
    maxMarks: number;
    obtained: string; 
};

interface Props {
    title?: string;
    inputRows: TableRow[];
    register: any;
    total: number | string;
    disabled?: boolean;
}

export default function WeaponTrainingTable({ title, inputRows, register, total, disabled }: Props) {
    return (
        <div className="space-y-6">
            {title && <h3 className="font-semibold text-md mb-2 underline">{title}</h3>}

            {/* INPUT TABLE: render the current form-controlled rows directly */}
            <div className="overflow-x-auto border rounded-lg shadow">
                <table className="w-full border text-sm">
                    <thead className="bg-gray-100 text-left">
                        <tr>
                            <th className="p-2 border">No</th>
                            <th className="p-2 border">Subject</th>
                            <th className="p-2 border">Max Marks</th>
                            <th className="p-2 border">Marks Obtained</th>
                        </tr>
                    </thead>

                    <tbody>
                        {inputRows.map((row, index) => (
                            <tr key={index}>
                                <td className="p-2 border text-center">{index + 1}</td>
                                <td className="p-2 border">{row.subject}</td>
                                <td className="p-2 border text-center">{row.maxMarks}</td>
                                <td className="p-2 border">
                                    <Input
                                        {...register(`records.${index}.obtained`)}
                                        type="number"
                                        placeholder="Enter Marks"
                                        className="w-full"
                                        disabled={disabled}
                                    />
                                </td>
                            </tr>
                        ))}

                        {/* TOTAL */}
                        <tr className="font-semibold bg-gray-50">
                            <td className="p-2 border text-center">{inputRows.length + 1}</td>
                            <td className="p-2 border">Total</td>
                            <td className="p-2 border text-center">
                                {inputRows.reduce((s, r) => s + r.maxMarks, 0)}
                            </td>
                            <td className="p-2 border text-center">{total}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
