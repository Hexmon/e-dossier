"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    getAllUsers,
    saveUser,
    deleteUser,
    type User,
} from "@/app/lib/api/userApi";

export function useUsers() {
    const queryClient = useQueryClient();

    // Fetch users with React Query
    const { data: users = [], isLoading: loading } = useQuery({
        queryKey: ["users"],
        queryFn: async () => {
            try {
                return await getAllUsers();
            } catch (error) {
                toast.error("Failed to load users.");
                return [];
            }
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Add user mutation
    const addUserMutation = useMutation({
        mutationFn: async (data: User) => {
            return await saveUser(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success("User added successfully");
        },
        onError: (error: any) => {
            const messages = Array.isArray(error?.extras?.messages) ? error.extras.messages : [];
            const detail =
                messages.length > 0
                    ? messages.join(" ")
                    : error?.message || error?.extras?.detail || "Failed to add user";
            toast.error(detail);
        },
    });

    // Edit user mutation
    const editUserMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: User }) => {
            return await saveUser({ ...data, id });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success("User updated successfully");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to update user");
        },
    });

    // Delete user mutation
    const removeUserMutation = useMutation({
        mutationFn: async (id: string) => {
            await deleteUser(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.warning("User deleted");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to delete user");
        },
    });

    return {
        users,
        loading,
        fetchUsers: useCallback(() => queryClient.invalidateQueries({ queryKey: ["users"] }), [queryClient]),
        addUser: addUserMutation.mutateAsync,
        editUser: (id: string, data: User) => editUserMutation.mutateAsync({ id, data }),
        removeUser: removeUserMutation.mutateAsync,
    };
}
