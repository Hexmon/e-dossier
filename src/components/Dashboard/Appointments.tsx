"use client";

import React, { useEffect, useRef, useState } from 'react';
import { api } from "@/app/lib/apiClient";
import { UniversalTable, TableConfig } from "@/components/layout/TableLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AppointmentRow = {
    positionName: string;
    officerName: string;
    startsAt: string | null;
};

type DashboardAppointmentsResponse = {
    items: AppointmentRow[];
};

// Helper function to format date consistently
const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`; // DD/MM/YYYY format
};

export default function Appointments() {
    const [appointmentsData, setAppointmentsData] = useState<AppointmentRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const didFetch = useRef(false);

    useEffect(() => {
        if (didFetch.current) return;
        didFetch.current = true;

        const loadAppointments = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await api.get<DashboardAppointmentsResponse>("/api/v1/dashboard/data/appointments");
                setAppointmentsData(res.items ?? []);
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to load appointments";
                setError(message);
                setAppointmentsData([]);
                console.error("Failed to load appointments", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadAppointments();
    }, []);

    // Configure the table
    const tableConfig: TableConfig<AppointmentRow> = {
        columns: [
            {
                key: 'positionName',
                label: 'Appointment Name',
                type: 'text',
                sortable: true,
                filterable: false,
                width: '35%',
            },
            {
                key: 'officerName',
                label: 'Officer Name',
                type: 'text',
                sortable: true,
                filterable: false,
                width: '35%',
            },
            {
                key: 'startsAt',
                label: 'Assumption Of Charge',
                type: 'custom', // Changed from 'date' to 'custom'
                sortable: true,
                filterable: false,
                width: '30%',
                render: (value) => formatDate(value), // Custom render function
            },
        ],
        theme: {
            variant: "blue"
        },
        styling: {
            compact: false,
            bordered: true,
            striped: true,
            hover: true,
        },
        loading: isLoading,
        emptyState: {
            message: error ?? 'No appointments found',
        },
    };

    return (
        <div className="container mx-auto py-2">
            <Card className='shadow-xl'>
                <CardHeader>
                    <CardTitle className="text-2xl font-semibold text-white bg-[#1677ff] p-2 rounded">Appointments</CardTitle>
                </CardHeader>
                <CardContent>
                    <UniversalTable<AppointmentRow>
                        data={appointmentsData}
                        config={tableConfig}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
