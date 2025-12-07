"use client";

import React from "react";
import { CardContent } from "@/components/ui/card";


interface GrandTotalProps {
    grandTotalMarks: number;
}

export default function GrandTotal( { grandTotalMarks }: GrandTotalProps ) {
    return (
        <div className="mt-3 space-y-6">
            <CardContent className="space-y-6">
                <h2 className="text-left text-lg font-bold text-gray-700">Grand Total</h2>
                <div>
                    <table className="w-full">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="border border-gray-300 px-4 py-2 text-left">Max Marks</th>
                                <th className="border border-gray-300 px-4 py-2 text-left">Marks Obtained</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-gray-300 px-4 py-2 text-left">150</td>
                                <td className="border border-gray-300 px-4 py-2 text-left">{grandTotalMarks}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </div>
    );
}
