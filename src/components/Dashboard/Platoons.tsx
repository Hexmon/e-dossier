"use client";

import React from 'react';
import { UniversalTable, TableConfig } from "@/components/layout/TableLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Define the Platoon data type
interface Platoon {
    platoon: string;
    strength: number;
}

// Sample data for 6 platoons with typical military strength (36-50 soldiers)
const platoonsData: Platoon[] = [
    { platoon: 'Arjun ', strength: 20 },
    { platoon: 'Karna ', strength: 19 },
    { platoon: 'Chandragupt ', strength: 19 },
    { platoon: 'Prithviraj ', strength: 16 },
    { platoon: 'Ranapratap ', strength: 19 },
    { platoon: 'Shivaji ', strength: 21 },
];

export default function Platoons() {
    // Configure the table
    const tableConfig: TableConfig<Platoon> = {
        columns: [
            {
                key: 'platoon',
                label: 'Platoon Name',
                type: 'text',
                sortable: true,
                filterable: false,
            },
            {
                key: 'strength',
                label: 'Strength',
                type: 'number',
                sortable: true,
                filterable: false,
            },
        ],
        theme: {
            variant: "blue",
        },
        styling: {
            compact: false,
            bordered: true,
            striped: true,
            hover: true,
        },
    };

    return (
        <div className="container mx-auto py-2">
            <Card className='shadow-xl'>
                <CardHeader>
                    <CardTitle className="text-2xl font-semibold text-white bg-[#1677ff] p-2 rounded">Platoons</CardTitle>
                </CardHeader>
                <CardContent>
                    <UniversalTable<Platoon>
                        data={platoonsData}
                        config={tableConfig}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
