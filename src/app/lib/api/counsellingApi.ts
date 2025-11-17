// NOTE: These are placeholders. Replace with your real API calls / endpoints.

import type { CounsellingRow } from "@/types/counselling";

/**
 * Simulated API. In production replace with actual fetch/axios calls.
 */
const FAKE_DB_KEY = "fakeCounsellingDb"; // localStorage key used for demo

async function readLocal() {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(FAKE_DB_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

async function writeLocal(records: any[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(FAKE_DB_KEY, JSON.stringify(records));
}

/**
 * Get records for a cadet (returns array of CounsellingRow-like objects)
 */
export async function getCounsellingRecords(ocId: string) {
    // Replace with: return fetch(`/api/counselling?ocId=${ocId}`).then(r => r.json());
    const all = await readLocal();
    // simple filter by ocId if stored that way (demo ignores ocId)
    return all;
}

/**
 * Save multiple records (payload array of {term,reason,warningType,date,warningBy})
 * Return saved records (with generated ids).
 */
export async function saveCounsellingRecords(ocId: string, payload: any[]) {
    // Replace with real POST request
    const all = await readLocal();
    const next = [...all];
    payload.forEach((p) => {
        next.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            ...p,
        });
    });
    await writeLocal(next);
    return payload.map((p, i) => ({ id: next[next.length - payload.length + i].id, ...p }));
}

/**
 * Delete by id
 */
export async function deleteCounsellingRecord(id: string) {
    const all = await readLocal();
    const next = all.filter((r) => r.id !== id);
    await writeLocal(next);
    return true;
}
