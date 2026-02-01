"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    getAllCourses,
    createCourse,
    updateCourse,
    deleteCourse,
    CourseResponse,
} from "@/app/lib/api/courseApi";

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
    const queryClient = useQueryClient();

    const { data: courses = [], isLoading: loading } = useQuery({
        queryKey: ["courses"],
        queryFn: async () => {
            const response = await getAllCourses();
            const items: CourseResponse[] = response?.items ?? [];
            return items.map((item) => toUICourse(item));
        },
        staleTime: 5 * 60 * 1000,
    });

    const addCourseMutation = useMutation({
        mutationFn: async (data: Omit<UICourse, "id">) => {
            const payload = {
                code: data.courseNo ?? "",
                title: `Course ${data.courseNo ?? ""}`,
                notes: `Start: ${data.startDate ?? ""}, End: ${data.endDate ?? ""}`,
            };
            return await createCourse(payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["courses"] });
            toast.success("Course added successfully");
        },
        onError: () => {
            toast.error("Failed to add course");
        },
    });

    const editCourseMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Omit<UICourse, "id"> }) => {
            const payload = {
                code: data.courseNo ?? "",
                title: `Course ${data.courseNo ?? ""}`,
                notes: `Start: ${data.startDate ?? ""}, End: ${data.endDate ?? ""}`,
            };
            return await updateCourse(id, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["courses"] });
            toast.success("Course updated successfully");
        },
        onError: () => {
            toast.error("Failed to update course");
        },
    });

    const removeCourseMutation = useMutation({
        mutationFn: async (id: string) => {
            await deleteCourse(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["courses"] });
            toast.success("Course deleted successfully");
        },
        onError: () => {
            toast.error("Failed to delete course");
        },
    });

    return {
        courses,
        loading,
        fetchCourses: () => queryClient.invalidateQueries({ queryKey: ["courses"] }),
        addCourse: addCourseMutation.mutateAsync,
        editCourse: (id: string, data: Omit<UICourse, "id">) =>
            editCourseMutation.mutateAsync({ id, data }),
        removeCourse: removeCourseMutation.mutateAsync,
    };
}