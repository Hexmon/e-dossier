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
    { platoon: 'Arjuna Platoon', strength: 42 },
    { platoon: 'Karna Platoon', strength: 38 },
    { platoon: 'Bheem Platoon', strength: 45 },
    { platoon: 'Shivaji Platoon', strength: 41 },
    { platoon: 'Chakra Platoon', strength: 36 },
    { platoon: 'Nakul Platoon', strength: 48 },
];

export default function Platoons() {
    // Configure the table
    const tableConfig: TableConfig<Platoon> = {
        columns: [
            {
                key: 'platoon',
                label: 'Platoon',
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
        styling: {
            compact: false,
            bordered: true,
            striped: true,
            hover: true,
        },
    };

    return (
        <div className="container mx-auto py-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-gray-800">Platoons</CardTitle>
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
