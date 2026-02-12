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

// Sample data for 10 appointments with realistic military positions
const appointmentsData: Appointment[] = [
    {
        appointment: 'COMDT',
        officersDetails: 'Lt Gen Neeraj Varshney',
        assumptionInCharge: '2024-08-15',
        remarks: '---'
    },
    {
        appointment: 'DCCI',
        officersDetails: 'Maj Gen Puneet Kapoor',
        assumptionInCharge: '2024-09-01',
        remarks: '---'
    },
    {
        appointment: 'CDR',
        officersDetails: 'Brig Atul Jaiswal',
        assumptionInCharge: '2024-10-10',
        remarks: '---'
    },
    {
        appointment: 'Dy CDR',
        officersDetails: 'Lt Col Raman',
        assumptionInCharge: '2024-07-22',
        remarks: 'Offg.'
    },
    {
        appointment: 'DS CORD',
        officersDetails: 'Lt Col Neeraj Tiwari',
        assumptionInCharge: '2024-11-05',
        remarks: '---'
    },
    {
        appointment: 'HOAT',
        officersDetails: 'Maj Sourav',
        assumptionInCharge: '2024-12-01',
        remarks: '---'
    },
    {
        appointment: 'CCO',
        officersDetails: 'Maj Puneet',
        assumptionInCharge: '2024-11-05',
        remarks: '---'
    },
    {
        appointment: 'Arjun Pl Cdr',
        officersDetails: 'Capt. Praveen Singh',
        assumptionInCharge: '2024-11-05',
        remarks: '---'
    },
    {
        appointment: 'Karna Pl Cdr',
        officersDetails: 'Maj Puneet Yadav',
        assumptionInCharge: '2024-11-05',
        remarks: '---'
    },
    {
        appointment: 'Chandragupt Pl Cdr',
        officersDetails: 'Maj R Krishnan',
        assumptionInCharge: '2024-11-05',
        remarks: '---'
    },
    {
        appointment: 'Prithviraj Pl Cdr',
        officersDetails: 'Capt. Vaibhav Gusain',
        assumptionInCharge: '2024-11-05',
        remarks: '---'
    },
    {
        appointment: 'Ranapratap Pl Cdr',
        officersDetails: 'Maj AS Dhaliwal',
        assumptionInCharge: '2024-11-05',
        remarks: '---'
    },
    {
        appointment: 'Shivaji Pl Cdr',
        officersDetails: 'Maj SB Bundel',
        assumptionInCharge: '2024-11-05',
        remarks: '---'
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
                label: 'Appointment Name',
                type: 'text',
                sortable: true,
                filterable: false,
                width: '20%',
            },
            {
                key: 'officersDetails',
                label: 'Officer Name',
                type: 'text',
                sortable: true,
                filterable: false,
                width: '25%',
            },
            {
                key: 'assumptionInCharge',
                label: 'Assumption Of Charge',
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
        theme: {
            variant: "blue"
        },
        styling: {
            compact: false,
            bordered: true,
            striped: true,
            hover: true,
        }
    };

    return (
        <div className="container mx-auto py-2">
            <Card className='shadow-xl'>
                <CardHeader>
                    <CardTitle className="text-2xl font-semibold text-primary-foreground bg-primary p-2 rounded">Appointments</CardTitle>
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
