"use client";

import { useCallback, useState } from "react";
import {
    getAllUsers,
    saveUser,
    deleteUser,
    type User,
} from "@/app/lib/api/userApi";
import { toast } from "sonner";

export function useUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    /** FETCH USERS */
    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const list = await getAllUsers();
            setUsers(list);
        } catch {
            toast.error("Failed to load users.");
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    /** ADD USER */
    const addUser = useCallback(async (data: User) => {
        const savedUser = await saveUser(data);
        await fetchUsers();
        return savedUser;
    }, [fetchUsers]);

    /** EDIT USER */
    const editUser = useCallback(
        async (id: string, data: User) => {
            const savedUser = await saveUser({ ...data, id });
            await fetchUsers();
            return savedUser;
        },
        [fetchUsers]
    );

    /** DELETE USER */
    const removeUser = useCallback(
        async (id: string) => {
            await deleteUser(id);
            await fetchUsers();
        },
        [fetchUsers]
    );

    return {
        users,
        loading,
        fetchUsers,
        addUser,
        editUser,
        removeUser,
    };
}
