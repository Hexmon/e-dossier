"use client";

import React, { useEffect, useRef, useState } from 'react';
import { api } from "@/app/lib/apiClient";
import { UniversalTable, TableConfig } from "@/components/layout/TableLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PlatoonRow = {
    platoonName: string;
    strength: number;
};

type DashboardPlatoonsResponse = {
    items: PlatoonRow[];
};

export default function Platoons() {
    const [platoonsData, setPlatoonsData] = useState<PlatoonRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const didFetch = useRef(false);

    useEffect(() => {
        if (didFetch.current) return;
        didFetch.current = true;

        const loadPlatoons = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await api.get<DashboardPlatoonsResponse>("/api/v1/dashboard/data/platoon");
                setPlatoonsData(res.items ?? []);
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to load platoons";
                setError(message);
                setPlatoonsData([]);
                console.error("Failed to load platoons", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadPlatoons();
    }, []);

    // Configure the table
    const tableConfig: TableConfig<PlatoonRow> = {
        columns: [
            {
                key: 'platoonName',
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
        loading: isLoading,
        emptyState: {
            message: error ?? 'No platoons found',
        },
    };

    return (
        <div className="container mx-auto py-2">
            <Card className='shadow-xl'>
                <CardHeader>
                    <CardTitle className="text-2xl font-semibold text-primary-foreground bg-primary p-2 rounded">Platoons</CardTitle>
                </CardHeader>
                <CardContent>
                    <UniversalTable<PlatoonRow>
                        data={platoonsData}
                        config={tableConfig}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
