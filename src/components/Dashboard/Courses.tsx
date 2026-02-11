"use client";

import React, { useEffect, useRef, useState } from 'react';
import { api } from "@/app/lib/apiClient";
import { UniversalTable, TableConfig } from "@/components/layout/TableLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CourseRow = {
    courseCode: string;
    strength: number;
    currentSemester: number | null;
};

type DashboardCoursesResponse = {
    items: CourseRow[];
};

export default function Courses() {
    const [coursesData, setCoursesData] = useState<CourseRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const didFetch = useRef(false);

    useEffect(() => {
        if (didFetch.current) return;
        didFetch.current = true;

        const loadCourses = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await api.get<DashboardCoursesResponse>("/api/v1/dashboard/data/course");
                setCoursesData(res.items ?? []);
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to load courses";
                setError(message);
                setCoursesData([]);
                console.error("Failed to load courses", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadCourses();
    }, []);

    // Configure the table
    const tableConfig: TableConfig<CourseRow> = {
        columns: [
            {
                key: 'courseCode',
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
                type: 'custom',
                sortable: true,
                filterable: false,
                render: (value) => (value === null || value === undefined ? '-' : value),
            },
        ],
        theme: {
            variant: 'blue',
        },
        styling: {
            compact: false,
            bordered: true,
            striped: true,
            hover: true,
        },
        loading: isLoading,
        emptyState: {
            message: error ?? 'No courses found',
        },
    };

    return (
        <div className="container mx-auto py-2">
            <Card className='shadow-xl'>
                <CardHeader>
                    <CardTitle className="text-2xl font-semibold text-white bg-[#1677ff] p-2 rounded">Courses</CardTitle>
                </CardHeader>
                <CardContent>
                    <UniversalTable<CourseRow>
                        data={coursesData}
                        config={tableConfig}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
