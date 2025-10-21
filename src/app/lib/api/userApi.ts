import { api } from "@/app/lib/apiClient";
import { baseURL, endpoints } from "@/constants/endpoints";

// User Type
export interface User {
    id?: string;
    username: string;
    name: string;
    email?: string;
    phone?: string;
    rank?: string;
    appointId?: string | null;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

// API Response Types
interface GetUsersResponse {
    status: number;
    ok: boolean;
    items: User[];
    count: number;
}

interface UserActionResponse {
    status: number;
    ok: boolean;
    user: User;
}

/* ============================================================
   🔹 Get All Users
============================================================ */
export async function getAllUsers(): Promise<User[]> {
    const response = await api.get<GetUsersResponse>(endpoints.admin.users, { baseURL });
    return response.items;
}

/* ============================================================
    Add or Edit User
============================================================ */

export async function saveUser(user: User): Promise<User> {
    const isEdit = Boolean(user.id);

    const endpoint = isEdit
        ? `${endpoints.admin.users}/${user.id}`
        : endpoints.admin.users;

    const method = isEdit ? "PATCH" : "POST";

    const res = await api.request<User>({
        method,
        endpoint,
        baseURL,
        body: user,
    });

    return res;
}


/* ============================================================
    Delete User
============================================================ */
export async function deleteUser(id: string): Promise<void> {
    await api.delete(`${endpoints.admin.users}/${id}`, { baseURL });
}
