"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Appointment,
  getAppointments,
  transferAppointment,
  TransferPayload,
  createAppointment,
  createPosition,
  CreateAppointmentPayload,
  getPositions,
  Position,
  updateAppointment,
  UpdateAppointmentPayload,
  deleteAppointment,
  updatePosition,
  deletePosition,
} from "@/app/lib/api/appointmentApi";

import { getAllUsers, User } from "@/app/lib/api/userApi";
import { getPlatoons, Platoon } from "@/app/lib/api/platoonApi";
import {
  fallbackAppointments,
  fallbackUsers,
} from "@/config/app.config";

export interface ServedUser {
  user: string;
  appointment: string;
  fromDate: string;
  toDate: string;
}

export function useAppointments() {
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading: loadingAppointments } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      try {
        const data = await getAppointments();
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("No appointment data available");
        }
        return data;
      } catch {
        toast.info("Using fallback appointments.");
        return fallbackAppointments;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      try {
        return await getAllUsers();
      } catch {
        toast.error("Unable to load users, using fallback.");
        return fallbackUsers;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: positions = [] } = useQuery({
    queryKey: ["positions"],
    queryFn: getPositions,
    staleTime: 5 * 60 * 1000,
  });

  const { data: platoons = [] } = useQuery({
    queryKey: ["platoons"],
    queryFn: getPlatoons,
    staleTime: 5 * 60 * 1000,
  });

  const { data: servedList = [] } = useQuery<ServedUser[]>({
    queryKey: ["servedList"],
    queryFn: () => [],
    staleTime: Infinity,
  });

  const handoverMutation = useMutation({
    mutationFn: async ({
      appointment,
      form,
    }: {
      appointment: Appointment;
      form: { toUser: string; handoverDate: string; takeoverDate: string };
    }) => {
      const { id, username, startsAt, positionName } = appointment;

      const handover = new Date(`${form.handoverDate}T00:00:00Z`);
      const takeover = new Date(`${form.takeoverDate}T00:00:00Z`);
      const start = new Date(startsAt);

      if (handover <= start) {
        throw new Error("Handover must be after the appointment start date.");
      }
      if (handover >= takeover) {
        throw new Error("Handover must be before takeover date.");
      }

      const selectedUser = users.find((u) => u.id === form.toUser);

      const payload: TransferPayload = {
        newUserId: form.toUser,
        prevEndsAt: handover.toISOString(),
        newStartsAt: takeover.toISOString(),
        positionId: appointment.positionId,
        scopeType: appointment.scopeType,
        scopeId: appointment.scopeType === "GLOBAL" ? null : appointment.scopeId,
        reason: "Shift handover",
      };

      await transferAppointment(id, payload);

      return {
        servedEntry: {
          user: username || "Unknown",
          appointment: positionName || "N/A",
          fromDate: startsAt,
          toDate: form.handoverDate,
        },
        updatedAppointment: {
          id,
          username: selectedUser?.username ?? "N/A",
          startsAt: form.takeoverDate,
        },
      };
    },
    onSuccess: ({ servedEntry }) => {
      queryClient.setQueryData<ServedUser[]>(["servedList"], (old = []) => [
        ...old,
        servedEntry,
      ]);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment handed over successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Handover failed. Try again.");
    },
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (formData: {
      userId: string;
      appointmentName: string;
      startsAt: string;
      isPlatoonCommander?: boolean;
      platoonId?: string;
      scopeType?: "GLOBAL" | "PLATOON";
    }) => {
      const positionKey = formData.appointmentName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      const defaultScope = formData.scopeType === "PLATOON" ? "PLATOON" : "GLOBAL";

      const positionResponse = await createPosition({
        key: positionKey,
        displayName: formData.appointmentName,
        defaultScope: defaultScope,
        singleton: true,
      });

      if (!positionResponse || !positionResponse.data) {
        throw new Error("Failed to create position: Invalid response");
      }

      const newPosition = positionResponse.data;

      const payload: CreateAppointmentPayload = {
        userId: formData.userId,
        positionId: newPosition.id,
        startsAt: new Date(formData.startsAt).toISOString(),
        endsAt: null,
        reason: formData.appointmentName,
        assignment: "PRIMARY",
        scopeType: defaultScope,
        scopeId: defaultScope === "PLATOON" ? formData.platoonId || null : null,
      };

      return await createAppointment(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment created successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create appointment");
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({
      appointmentId,
      payload,
    }: {
      appointmentId: string;
      payload: UpdateAppointmentPayload & { positionId?: string; positionName?: string };
    }) => {
      let newUsername: string | undefined;
      if (payload.userId) {
        const selectedUser = users.find((u) => u.id === payload.userId);
        newUsername = selectedUser?.username;
      }

      const appointmentPayload: UpdateAppointmentPayload = {
        startsAt: payload.startsAt,
        userId: payload.userId,
        ...(newUsername && { username: newUsername }),
      };

      const appointmentPromise = updateAppointment(appointmentId, appointmentPayload);

      let positionPromise = Promise.resolve({ data: null } as any);
      if (payload.positionId && payload.positionName) {
        positionPromise = updatePosition(payload.positionId, {
          displayName: payload.positionName,
        });
      }

      const [appointmentResponse] = await Promise.all([
        appointmentPromise,
        positionPromise,
      ]);

      return appointmentResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment updated successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update appointment");
    },
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const appointment = appointments.find((a) => a.id === appointmentId);
      if (!appointment) {
        throw new Error("Appointment not found");
      }

      const response = await deleteAppointment(appointmentId);

      if (response && response.data && appointment.positionId) {
        try {
          await deletePosition(appointment.positionId);
        } catch (positionError: any) {
          console.error(positionError);
        }
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete appointment");
    },
  });

  return {
    appointments,
    servedList,
    users,
    positions,
    platoons,
    loading: loadingAppointments,
    error: null,
    fetchAppointments: useCallback(() => queryClient.invalidateQueries({ queryKey: ["appointments"] }), [queryClient]),
    fetchUsers: useCallback(() => queryClient.invalidateQueries({ queryKey: ["users"] }), [queryClient]),
    fetchUsersAndPositions: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["platoons"] });
    },
    handleHandover: (
      appointment: Appointment,
      form: { toUser: string; handoverDate: string; takeoverDate: string }
    ) => handoverMutation.mutateAsync({ appointment, form }),
    createNewAppointment: createAppointmentMutation.mutateAsync,
    handleEditAppointment: (
      appointmentId: string,
      payload: UpdateAppointmentPayload & { positionId?: string; positionName?: string }
    ) => updateAppointmentMutation.mutateAsync({ appointmentId, payload }),
    handleDeleteAppointment: deleteAppointmentMutation.mutateAsync,
  };
}