"use client";

import React from 'react';
import { UniversalTable, TableConfig } from "@/components/layout/TableLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Define the Appointment data type
interface Appointment {
    appointment: string;
    officersDetails: string;
    assumptionInCharge: string; // Date stored as ISO string
    remarks: string;
}

// Sample data for 6 appointments with realistic military positions
const appointmentsData: Appointment[] = [
    {
        appointment: 'Commanding Officer',
        officersDetails: 'Col. Rajesh Kumar',
        assumptionInCharge: '2024-08-15',
        remarks: 'Transferred from Eastern Command'
    },
    {
        appointment: 'Second in Command',
        officersDetails: 'Lt. Col. Amit Sharma',
        assumptionInCharge: '2024-09-01',
        remarks: 'Promoted from Major'
    },
    {
        appointment: 'Adjutant',
        officersDetails: 'Maj. Priya Singh',
        assumptionInCharge: '2024-10-10',
        remarks: 'Regular posting'
    },
    {
        appointment: 'Quartermaster',
        officersDetails: 'Maj. Vikram Reddy',
        assumptionInCharge: '2024-07-22',
        remarks: 'Administrative duties'
    },
    {
        appointment: 'Training Officer',
        officersDetails: 'Capt. Anil Verma',
        assumptionInCharge: '2024-11-05',
        remarks: 'Specialized training background'
    },
    {
        appointment: 'Intelligence Officer',
        officersDetails: 'Capt. Neha Patel',
        assumptionInCharge: '2024-12-01',
        remarks: 'Security clearance verified'
    },
];

// Helper function to format date consistently
const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`; // DD/MM/YYYY format
};

export default function Appointments() {
    // Configure the table
    const tableConfig: TableConfig<Appointment> = {
        columns: [
            {
                key: 'appointment',
                label: 'Appointment',
                type: 'text',
                sortable: true,
                filterable: false,
                width: '20%',
            },
            {
                key: 'officersDetails',
                label: 'Officers Details',
                type: 'text',
                sortable: true,
                filterable: false,
                width: '25%',
            },
            {
                key: 'assumptionInCharge',
                label: 'Assumption In Charge',
                type: 'custom', // Changed from 'date' to 'custom'
                sortable: true,
                filterable: false,
                width: '25%',
                render: (value) => formatDate(value), // Custom render function
            },
            {
                key: 'remarks',
                label: 'Remarks',
                type: 'text',
                sortable: false,
                filterable: false,
                width: '30%',
            },
        ],
        styling: {
            compact: false,
            bordered: true,
            striped: true,
            hover: true,
        }
    };

    return (
        <div className="container mx-auto py-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-gray-800">Appointments</CardTitle>
                </CardHeader>
                <CardContent>
                    <UniversalTable<Appointment>
                        data={appointmentsData}
                        config={tableConfig}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
