"use client";

import { useCallback, useState } from "react";
import {
    getAllCourses,
    createCourse,
    updateCourse,
    deleteCourse,
    CourseResponse,
} from "@/app/lib/api/courseApi";

export interface Course {
    id: string;
    code: string;
    title: string;
    notes?: string;
    startDate?: string;
    endDate?: string;
    trgModel?: number;
}

export interface UICourse {
    id: string;
    courseNo?: string;
    startDate?: string;
    endDate?: string;
    trgModel?: number;
}

function parseNotes(notes?: string): { startDate: string; endDate: string } {
    if (!notes) return { startDate: "", endDate: "" };

    const matchStart = notes.match(/Start:\s*([\d-]+)/);
    const matchEnd = notes.match(/End:\s*([\d-]+)/);

    return {
        startDate: matchStart?.[1] ?? "",
        endDate: matchEnd?.[1] ?? "",
    };
}

function toUICourse(course: CourseResponse): UICourse {
    const { startDate, endDate } = parseNotes(course.notes);

    return {
        id: course.id,
        courseNo: course.code,
        startDate,
        endDate,
        trgModel: 0,
    };
}

export function useCourses() {
    const [courses, setCourses] = useState<UICourse[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    const fetchCourses = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getAllCourses();
            const items: CourseResponse[] = response?.items ?? [];

            const mapped = items.map((item) => toUICourse(item));
            setCourses(mapped);
        } finally {
            setLoading(false);
        }
    }, []);

    const addCourse = useCallback(
        async (data: Omit<UICourse, "id">) => {
            const payload = {
                code: data.courseNo ?? "",
                title: `Course ${data.courseNo ?? ""}`,
                notes: `Start: ${data.startDate ?? ""}, End: ${data.endDate ?? ""}`,
            };

            const created = await createCourse(payload);
            const mapped = toUICourse(created);

            setCourses(prev => [...prev, mapped]);
            return mapped;
        },
        []
    );

    const editCourse = useCallback(
        async (id: string, data: Omit<UICourse, "id">) => {
            const payload = {
                code: data.courseNo ?? "",
                title: `Course ${data.courseNo ?? ""}`,
                notes: `Start: ${data.startDate ?? ""}, End: ${data.endDate ?? ""}`,
            };

            await updateCourse(id, payload);

            setCourses(prev =>
                prev.map(c => (c.id === id ? { ...c, ...data } : c))
            );
        },
        []
    );

    const removeCourse = useCallback(async (id: string) => {
        await deleteCourse(id);
        setCourses((prev) => prev.filter((c) => c.id !== id));
    }, []);

    return {
        courses,
        loading,
        fetchCourses,
        addCourse,
        editCourse,
        removeCourse,
    };
}