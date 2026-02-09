"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    listSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
    Subject,
    SubjectCreate,
    SubjectUpdate,
    ListSubjectsParams,
} from "@/app/lib/api/subjectsApi";

export function useSubjects(params?: ListSubjectsParams) {
    const queryClient = useQueryClient();

    const { data: subjects = [], isLoading: loading } = useQuery({
        queryKey: ["subjects", params],
        queryFn: async () => {
            const data = await listSubjects(params);
            return data?.subjects || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const addSubjectMutation = useMutation({
        mutationFn: createSubject,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["subjects"] });
            toast.success("Subject created successfully");
        },
        onError: () => toast.error("Failed to create subject"),
    });

    const editSubjectMutation = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: SubjectUpdate }) =>
            updateSubject(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["subjects"] });
            toast.success("Subject updated successfully");
        },
        onError: () => toast.error("Failed to update subject"),
    });

    const removeSubjectMutation = useMutation({
        mutationFn: deleteSubject,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["subjects"] });
            toast.success("Subject deleted successfully");
        },
        onError: () => toast.error("Failed to delete subject"),
    });

    return {
        loading,
        subjects,
        fetchSubjects: (newParams?: ListSubjectsParams) =>
            queryClient.invalidateQueries({ queryKey: ["subjects", newParams] }),
        addSubject: addSubjectMutation.mutateAsync,
        editSubject: (id: string, updates: SubjectUpdate) =>
            editSubjectMutation.mutateAsync({ id, updates }),
        removeSubject: removeSubjectMutation.mutateAsync,
    };
}