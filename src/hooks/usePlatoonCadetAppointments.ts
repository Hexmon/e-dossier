import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  platoonCadetAppointmentsApi,
  type CreateCadetAppointmentPayload,
  type TransferCadetAppointmentPayload,
  type UpdateCadetAppointmentPayload,
} from "@/app/lib/api/platoonCadetAppointmentsApi";

const QUERY_KEY = ["platoon-cadet-appointments"] as const;

export function usePlatoonCadetAppointments() {
  const queryClient = useQueryClient();

  const dashboardQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: platoonCadetAppointmentsApi.getDashboard,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateCadetAppointmentPayload) =>
      platoonCadetAppointmentsApi.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Cadet appointment created.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create cadet appointment.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      appointmentId,
      payload,
    }: {
      appointmentId: string;
      payload: UpdateCadetAppointmentPayload;
    }) => platoonCadetAppointmentsApi.update(appointmentId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Cadet appointment updated.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update cadet appointment.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (appointmentId: string) =>
      platoonCadetAppointmentsApi.remove(appointmentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Cadet appointment deleted.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete cadet appointment.");
    },
  });

  const transferMutation = useMutation({
    mutationFn: ({
      appointmentId,
      payload,
    }: {
      appointmentId: string;
      payload: TransferCadetAppointmentPayload;
    }) => platoonCadetAppointmentsApi.transfer(appointmentId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Cadet appointment transferred.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to transfer cadet appointment.");
    },
  });

  return {
    dashboardQuery,
    createMutation,
    updateMutation,
    deleteMutation,
    transferMutation,
  };
}
