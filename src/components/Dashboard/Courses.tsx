"use client";

import React from 'react';
import { UniversalTable, TableConfig } from "@/components/layout/TableLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Define the Course data type
interface Course {
    course: string;
    strength: number;
    currentSemester: number;
}

// Sample data for 6 courses (TES-50 to TES-55)
const coursesData: Course[] = [
    { course: 'TES-50', strength: 27, currentSemester: 4 },
    { course: 'TES-51', strength: 29, currentSemester: 3 },
    { course: 'TES-52', strength: 29, currentSemester: 2 },
    { course: 'TES-53', strength: 29, currentSemester: 1 },
];

export default function Courses() {
    // Configure the table
    const tableConfig: TableConfig<Course> = {
        columns: [
            {
                key: 'course',
                label: 'Course',
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
            {
                key: 'currentSemester',
                label: 'Current Semester',
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
        }
    };

    return (
        <div className="container mx-auto py-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-gray-800">Courses</CardTitle>
                </CardHeader>
                <CardContent>
                    <UniversalTable<Course>
                        data={coursesData}
                        config={tableConfig}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
