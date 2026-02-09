"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    getPendingUsers,
    getAvailableSlots,
    approveSignupRequest,
    rejectSignupRequest,
    PendingUser,
    PositionSlot,
} from "@/app/lib/api/ApprovalApi";
import { FALLBACK_PENDING_USERS, FALLBACK_SLOTS } from "@/config/app.config";

export function useApproval() {
    const queryClient = useQueryClient();

    const { data: pendingUsers = [], isLoading: loadingUsers } = useQuery({
        queryKey: ["pendingUsers"],
        queryFn: async () => {
            try {
                return await getPendingUsers();
            } catch (error) {
                console.warn("Pending users API failed, using fallback");
                toast.warning("Using fallback data for pending users");
                return FALLBACK_PENDING_USERS;
            }
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
    });

    const { data: slots = [], isLoading: loadingSlots } = useQuery({
        queryKey: ["availableSlots"],
        queryFn: async () => {
            try {
                return await getAvailableSlots();
            } catch (error) {
                console.warn("Slots API failed, using fallback");
                toast.warning("Using fallback data for slots");
                return FALLBACK_SLOTS;
            }
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const availableSlots = slots.filter((s) => !s.occupied);

    const approveMutation = useMutation({
        mutationFn: async ({
            user,
            appointmentKey,
            scopeType,
        }: {
            user: PendingUser;
            appointmentKey: string;
            scopeType: "GLOBAL" | "PLATOON";
        }) => {
            return await approveSignupRequest(user.id, appointmentKey, scopeType);
        },
        onSuccess: (response) => {
            toast.success(response.message);
            queryClient.invalidateQueries({ queryKey: ["pendingUsers"] });
            queryClient.invalidateQueries({ queryKey: ["availableSlots"] });
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to approve user");
        },
    });

    const rejectMutation = useMutation({
        mutationFn: async (userId: string) => {
            return await rejectSignupRequest(userId);
        },
        onSuccess: (response) => {
            toast.error(response.message);
            queryClient.invalidateQueries({ queryKey: ["pendingUsers"] });
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to reject user");
        },
    });

    const approve = async (user: PendingUser, appointmentKey: string) => {
        if (!appointmentKey) {
            toast.error("Select an appointment first.");
            return;
        }

        const slot = availableSlots.find((s) => s.position.key === appointmentKey);

        if (!slot) {
            toast.error("Invalid appointment selected.");
            return;
        }

        const scopeType =
            slot.scope.type === "GLOBAL" || slot.scope.type === "PLATOON"
                ? slot.scope.type
                : "GLOBAL";

        await approveMutation.mutateAsync({ user, appointmentKey, scopeType });
    };

    const reject = async (user: PendingUser) => {
        await rejectMutation.mutateAsync(user.id);
    };

    return {
        pendingUsers,
        slots,
        availableSlots,
        loading: loadingUsers || loadingSlots,
        error: null,
        fetchData: () => {
            queryClient.invalidateQueries({ queryKey: ["pendingUsers"] });
            queryClient.invalidateQueries({ queryKey: ["availableSlots"] });
        },
        approve,
        reject,
    };
}