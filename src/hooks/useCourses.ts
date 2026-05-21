"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    getAllCourses,
    createCourse,
    updateCourse,
    deleteCourse,
    CourseResponse,
    type GetCoursesParams,
} from "@/app/lib/api/courseApi";
import { getFriendlyApiErrorMessage } from "@/app/lib/apiClient";

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

type UseCoursesOptions = GetCoursesParams & {
    queryScope?: string;
};

export function useCourses(options: UseCoursesOptions = {}) {
    const queryClient = useQueryClient();
    const normalizedQuery = options.q?.trim() || undefined;
    const limit = options.limit;
    const offset = options.offset ?? 0;
    const includeDeleted = options.includeDeleted;

    const coursesQuery = useQuery({
        queryKey: [
            "courses",
            options.queryScope ?? "list",
            { q: normalizedQuery ?? "", includeDeleted: includeDeleted ?? false, limit, offset },
        ],
        queryFn: async () => {
            return getAllCourses({
                q: normalizedQuery,
                includeDeleted,
                limit,
                offset,
            });
        },
        placeholderData: (previous) => previous,
    });

    const courses = useMemo(
        () => (coursesQuery.data?.items ?? []).map((item: CourseResponse) => toUICourse(item)),
        [coursesQuery.data?.items]
    );
    const totalCount = coursesQuery.data?.total ?? coursesQuery.data?.count ?? courses.length;
    const { isLoading: loading, isFetching } = coursesQuery;

    const fetchCourses = useCallback(
        () => queryClient.invalidateQueries({ queryKey: ["courses"] }),
        [queryClient]
    );

    useEffect(() => {
        if (!coursesQuery.isError) return;
        toast.error(getFriendlyApiErrorMessage(coursesQuery.error, "Failed to load courses"));
    }, [coursesQuery.isError, coursesQuery.error]);

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
        onError: (error) => {
            toast.error(getFriendlyApiErrorMessage(error, "Failed to add course"));
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
        onError: (error) => {
            toast.error(getFriendlyApiErrorMessage(error, "Failed to update course"));
        },
    });

    const removeCourseMutation = useMutation({
        mutationFn: async (id: string) => {
            await deleteCourse(id, { hard: true });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["courses"] });
            toast.success("Course deleted successfully");
        },
        onError: (error) => {
            toast.error(getFriendlyApiErrorMessage(error, "Failed to delete course"));
        },
    });

    return {
        courses,
        totalCount,
        pageLimit: coursesQuery.data?.limit ?? limit ?? 100,
        pageOffset: coursesQuery.data?.offset ?? offset,
        loading,
        isFetching,
        fetchCourses,
        addCourse: addCourseMutation.mutateAsync,
        editCourse: (id: string, data: Omit<UICourse, "id">) =>
            editCourseMutation.mutateAsync({ id, data }),
        removeCourse: removeCourseMutation.mutateAsync,
    };
}
