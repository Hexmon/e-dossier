"use client";

import React, { useEffect, useState } from 'react';
import { api } from "@/app/lib/apiClient";
import { UniversalTable, TableConfig } from "@/components/layout/TableLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DASHBOARD_COURSES_PAGE_SIZE = 5;

type CourseRow = {
    courseCode: string;
    strength: number;
    currentSemester: number | null;
};

type DashboardCoursesPagination = {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
};

type DashboardCoursesResponse = {
    items: CourseRow[];
    count?: number;
    pagination?: DashboardCoursesPagination;
};

const initialPagination: DashboardCoursesPagination = {
    page: 1,
    pageSize: DASHBOARD_COURSES_PAGE_SIZE,
    totalItems: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
};

export default function Courses() {
    const [coursesData, setCoursesData] = useState<CourseRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<DashboardCoursesPagination>(initialPagination);

    useEffect(() => {
        const controller = new AbortController();
        let isCurrent = true;

        const loadCourses = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await api.get<DashboardCoursesResponse>("/api/v1/dashboard/data/course", {
                    query: {
                        page,
                        limit: DASHBOARD_COURSES_PAGE_SIZE,
                    },
                    signal: controller.signal,
                });

                if (!isCurrent) return;

                const items = res.items ?? [];
                const totalItems = res.count ?? items.length;
                const nextPagination = res.pagination ?? {
                    page,
                    pageSize: DASHBOARD_COURSES_PAGE_SIZE,
                    totalItems,
                    totalPages: Math.max(1, Math.ceil(totalItems / DASHBOARD_COURSES_PAGE_SIZE)),
                    hasPreviousPage: page > 1,
                    hasNextPage: page * DASHBOARD_COURSES_PAGE_SIZE < totalItems,
                };

                setCoursesData(items);
                setPagination(nextPagination);

                if (nextPagination.page !== page) {
                    setPage(nextPagination.page);
                }
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') {
                    return;
                }

                if (!isCurrent) return;

                const message = err instanceof Error ? err.message : "Failed to load courses";
                setError(message);
                setCoursesData([]);
                setPagination(initialPagination);
                console.error("Failed to load courses", err);
            } finally {
                if (isCurrent) {
                    setIsLoading(false);
                }
            }
        };

        loadCourses();

        return () => {
            isCurrent = false;
            controller.abort();
        };
    }, [page]);

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
        features: {
            pagination: true,
        },
        pagination: {
            mode: 'server',
            pageSize: DASHBOARD_COURSES_PAGE_SIZE,
            totalItems: pagination.totalItems,
            currentPage: pagination.page,
        },
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
                    <CardTitle className="text-2xl font-semibold text-primary-foreground bg-primary p-2 rounded">Courses</CardTitle>
                </CardHeader>
                <CardContent>
                    <UniversalTable<CourseRow>
                        data={coursesData}
                        config={tableConfig}
                        onPageChange={(nextPage) => {
                            if (nextPage === page) return;

                            setIsLoading(true);
                            setPage(nextPage);
                        }}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
