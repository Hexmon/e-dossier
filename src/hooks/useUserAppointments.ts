// hooks/useUserAppointments.ts
import { useQuery } from "@tanstack/react-query";
import { listAppointments } from "@/app/lib/api/AppointmentFilterApi";

export function useUserAppointments(userId: string | undefined) {
    return useQuery({
        queryKey: ["userAppointments", userId],
        queryFn: async () => {
            if (!userId) return { appointments: [] };
            const result = await listAppointments({ userId, active: true });
            return result;
        },
        enabled: !!userId && userId.length > 0,
        staleTime: 5 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        select: (data) => {
            const activeAppointment = data.appointments.find(apt => !apt.endsAt) || data.appointments[0];

            let isAdmin = false;
            if (activeAppointment) {
                const positionName = activeAppointment.positionName || "";
                const normalizedPosition = positionName.toLowerCase();
                isAdmin = normalizedPosition === "admin" || normalizedPosition === "super admin";
            }

            return {
                appointments: data.appointments,
                isAdmin,
                activeAppointment,
            };
        },
    });
}