"use client";

import { useState } from "react";
import { InterviewFormRecord, InterviewOfficer } from "@/types/interview";

export function useInterviewForms(initial: InterviewFormRecord[] = []) {
    const [records, setRecords] = useState<InterviewFormRecord[]>(initial);
    const [loading, setLoading] = useState(false);

    async function fetchAll(): Promise<InterviewFormRecord[]> {
        setLoading(true);
        try {
            // replace with real fetch
            await new Promise((r) => setTimeout(r, 300));
            return records;
        } finally {
            setLoading(false);
        }
    }

    async function save(payload: InterviewFormRecord): Promise<InterviewFormRecord | null> {
        setLoading(true);
        try {
            await new Promise((r) => setTimeout(r, 300));
            const next: InterviewFormRecord = {
                ...payload,
                id: payload.id ?? `${Date.now()}`,
            };
            setRecords((prev) => [...prev.filter((p) => p.id !== next.id), next]);
            return next;
        } finally {
            setLoading(false);
        }
    }

    async function update(id: string, payload: Partial<InterviewFormRecord>): Promise<InterviewFormRecord | null> {
        setLoading(true);
        try {
            await new Promise((r) => setTimeout(r, 300));
            let updated: InterviewFormRecord | null = null;
            setRecords((prev) =>
                prev.map((r) => {
                    if (r.id === id) {
                        updated = { ...r, ...payload };
                        return updated;
                    }
                    return r;
                })
            );
            return updated;
        } finally {
            setLoading(false);
        }
    }

    async function remove(id: string): Promise<boolean> {
        setLoading(true);
        try {
            await new Promise((r) => setTimeout(r, 300));
            setRecords((prev) => prev.filter((r) => r.id !== id));
            return true;
        } finally {
            setLoading(false);
        }
    }

    return {
        records,
        loading,
        fetchAll,
        save,
        update,
        remove,
    };
}
