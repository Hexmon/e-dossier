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
    deletedAt?: string | null;
    deactivatedAt?: string | null;
    hasActiveAppointment?: boolean;
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
export async function getAllUsers(options?: {
    limit?: number;
    offset?: number;
    includeDeleted?: boolean;
    isActive?: boolean;
}): Promise<User[]> {
    const query: Record<string, string> = {};
    if (typeof options?.limit === "number") query.limit = String(options.limit);
    if (typeof options?.offset === "number") query.offset = String(options.offset);
    if (typeof options?.includeDeleted === "boolean") query.includeDeleted = String(options.includeDeleted);
    if (typeof options?.isActive === "boolean") query.isActive = String(options.isActive);

    const response = await api.get<GetUsersResponse>(endpoints.admin.users, {
        baseURL,
        query,
    });
    return response.items;
}

export async function getUsersByQuery(q: string, limit: number = 100): Promise<User[]> {
    const query = q.trim();
    if (!query) return [];

    const response = await api.get<GetUsersResponse>(endpoints.admin.users, {
        baseURL,
        query: {
            q: query,
            limit: String(limit),
        },
    });
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

/**
 * Search users for dropdowns.
 * GET /api/v1/admin/users?q=QUERY&isActive=true
 */
export async function searchUsers(
    query: string,
    scopeType?: string,
    limit: number = 20
): Promise<User[]> {
    const q = query.trim();
    if (!q) return [];

    const queryParams: Record<string, string> = {
        q,
        isActive: "true",
        limit: String(limit),
    };
    if (scopeType) queryParams.scopeType = scopeType;
    const response = await api.get<{ items: User[]; count: number }>(
        endpoints.admin.users,
        { baseURL, query: queryParams }
    );
    return response.items;
}
