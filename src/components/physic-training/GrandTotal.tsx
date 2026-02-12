"use client";

import React from "react";
import { CardContent } from "@/components/ui/card";
import { UniversalTable, TableColumn, TableConfig } from "@/components/layout/TableLayout";

interface GrandTotalProps {
    grandTotalMarks: number;
}

type GrandTotalRow = {
    maxMarks: number;
    marksObtained: number;
};

export default function GrandTotal({ grandTotalMarks }: GrandTotalProps) {
    const data: GrandTotalRow[] = [
        {
            maxMarks: 150,
            marksObtained: grandTotalMarks
        }
    ];

    const columns: TableColumn<GrandTotalRow>[] = [
        {
            key: "maxMarks",
            label: "Max Marks",
            type: "number",
            render: (value) => value
        },
        {
            key: "marksObtained",
            label: "Marks Obtained",
            type: "number",
            render: (value) => value
        }
    ];

    const config: TableConfig<GrandTotalRow> = {
        columns,
        features: {
            sorting: false,
            filtering: false,
            pagination: false,
            selection: false,
            search: false
        },
        styling: {
            compact: false,
            bordered: true,
            striped: false,
            hover: false
        }
    };

    return (
        <div className="mt-3 space-y-6">
            <CardContent className="space-y-6">
                <h2 className="text-left text-lg font-bold text-foreground">Grand Total</h2>
                <div>
                    <UniversalTable<GrandTotalRow>
                        data={data}
                        config={config}
                    />
                </div>
            </CardContent>
        </div>
    );
}
