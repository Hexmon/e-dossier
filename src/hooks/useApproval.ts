"use client";

import { useCallback, useMemo, useState } from "react";
import {
    getPendingUsers,
    getAvailableSlots,
    approveSignupRequest,
    rejectSignupRequest,
    PendingUser,
    PositionSlot,
} from "@/app/lib/api/ApprovalApi";
import { FALLBACK_PENDING_USERS, FALLBACK_SLOTS } from "@/config/app.config";
import { toast } from "sonner";

export function useApproval() {
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
    const [slots, setSlots] = useState<PositionSlot[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Load users + slots
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            const [users, slotList] = await Promise.all([
                getPendingUsers(),
                getAvailableSlots(),
            ]);

            setPendingUsers(users);
            setSlots(slotList);
            setError(null);
        } catch (error) {
            console.warn("Approval API failed — fallback used.");

            toast.warning("Using fallback data due to API error.");
            setError("Unable to fetch live data — showing fallback data.");
            setPendingUsers(FALLBACK_PENDING_USERS);
            setSlots(FALLBACK_SLOTS);
        } finally {
            setLoading(false);
        }
    }, []);

    // Available (unoccupied) slots
    const availableSlots = useMemo(
        () => slots.filter((s) => !s.occupied),
        [slots]
    );

    // Approve User
    const approve = useCallback(
        async (user: PendingUser, appointmentKey: string) => {
            if (!appointmentKey) {
                toast.error("Select an appointment first.");
                return;
            }

            const slot = availableSlots.find(
                (s) => s.position.key === appointmentKey
            );

            if (!slot) {
                toast.error("Invalid appointment selected.");
                return;
            }

            try {
                const scopeType =
                    slot.scope.type === "GLOBAL" || slot.scope.type === "PLATOON"
                        ? slot.scope.type
                        : "GLOBAL";

                const response = await approveSignupRequest(
                    user.id,
                    appointmentKey,
                    scopeType
                );

                toast.success(response.message);

                // remove approved user
                setPendingUsers((prev) => prev.filter((u) => u.id !== user.id));
            } catch (error: any) {
                toast.error(error.message || "Failed to approve user.");
            }
        },
        [availableSlots]
    );

    // Reject user
    const reject = useCallback(async (user: PendingUser) => {
        try {
            const res = await rejectSignupRequest(user.id);
            toast.error(res.message);

            setPendingUsers((prev) => prev.filter((u) => u.id !== user.id));
        } catch (error: any) {
            toast.error(error.message || "Failed to reject user.");
        }
    }, []);

    return {
        pendingUsers,
        slots,
        availableSlots,
        loading,
        error,
        fetchData,
        approve,
        reject,
    };
}
