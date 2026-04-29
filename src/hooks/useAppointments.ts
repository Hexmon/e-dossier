"use client";

import { useCallback, useState } from "react";
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
  CreateAppointmentConflict,
  getPositions,
  Position,
  updateAppointment,
  UpdateAppointmentPayload,
  deleteAppointment,
  updatePosition,
} from "@/app/lib/api/appointmentApi";
import { ApiClientError } from "@/app/lib/apiClient";

import { getAllUsers, User } from "@/app/lib/api/userApi";
import { getPlatoons, Platoon } from "@/app/lib/api/platoonApi";
import {
  fallbackAppointments,
  fallbackUsers,
} from "@/config/app.config";
import {
  findReusablePosition,
  normalizePositionKey,
} from "@/lib/appointments/position-reuse";
import {
  buildServedHistory,
  type ServedHistoryEntry,
} from "@/lib/appointments/served-history";

export type ServedUser = ServedHistoryEntry;

function mergeServedHistoryEntries(
  entries: ServedUser[],
  incoming: ServedUser,
): ServedUser[] {
  return [incoming, ...entries.filter((entry) => entry.id !== incoming.id)].sort(
    (left, right) => new Date(right.toDate).getTime() - new Date(left.toDate).getTime(),
  );
}

const APPOINTMENT_SCOPE_CONFLICT_MESSAGE =
  "Another active/overlapping appointment already exists for this position & scope";

export type CreateAppointmentConflictState = {
  appointmentName: string;
  scopeType: "GLOBAL" | "PLATOON";
  scopeId: string | null;
  currentHolder: {
    id: string;
    userId: string;
    username: string;
    startsAt: string;
    endsAt: string | null;
  } | null;
};

export function useAppointments() {
  const queryClient = useQueryClient();
  const [createAppointmentConflict, setCreateAppointmentConflict] =
    useState<CreateAppointmentConflictState | null>(null);

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
    queryFn: async () => {
      const data = await getAppointments({ active: false });
      return buildServedHistory(data);
    },
    staleTime: 5 * 60 * 1000,
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
      if (handover > takeover) {
        throw new Error("Handover must be on or before takeover date.");
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
          id,
          user: username || "Unknown",
          appointment: positionName || "N/A",
          fromDate: startsAt,
          toDate: handover.toISOString(),
        },
        updatedAppointment: {
          id,
          username: selectedUser?.username ?? "N/A",
          startsAt: form.takeoverDate,
        },
      };
    },
    onSuccess: ({ servedEntry }) => {
      queryClient.setQueryData<ServedUser[]>(["servedList"], (old = []) =>
        mergeServedHistoryEntries(old, servedEntry),
      );
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["servedList"] });
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
      const appointmentName = formData.appointmentName.trim();
      const positionKey = normalizePositionKey(appointmentName);
      const defaultScope = formData.scopeType === "PLATOON" ? "PLATOON" : "GLOBAL";
      const ensureCompatibleScope = (position: Position) => {
        if (position.defaultScope !== defaultScope) {
          throw new Error(
            `Position "${position.displayName ?? appointmentName}" already exists with ${position.defaultScope} scope.`,
          );
        }
        return position;
      };

      const resolvePosition = async (): Promise<Position> => {
        const existing = findReusablePosition(positions, appointmentName);
        if (existing) {
          return ensureCompatibleScope(existing);
        }

        try {
          const positionResponse = await createPosition({
            key: positionKey,
            displayName: appointmentName,
            defaultScope,
            singleton: true,
          });

          if (!positionResponse || !positionResponse.data) {
            throw new Error("Failed to create position: Invalid response");
          }

          return positionResponse.data;
        } catch (error) {
          const latestPositions = await getPositions();
          const reused = findReusablePosition(latestPositions, appointmentName);
          if (reused) {
            return ensureCompatibleScope(reused);
          }
          throw error;
        }
      };

      const position = await resolvePosition();

      const payload: CreateAppointmentPayload = {
        userId: formData.userId,
        positionId: position.id,
        startsAt: new Date(formData.startsAt).toISOString(),
        endsAt: null,
        reason: appointmentName,
        assignment: "PRIMARY",
        scopeType: defaultScope,
        scopeId: defaultScope === "PLATOON" ? formData.platoonId || null : null,
      };

      return await createAppointment(payload);
    },
    onSuccess: () => {
      setCreateAppointmentConflict(null);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment created successfully!");
    },
    onError: (error: any) => {
      if (
        error instanceof ApiClientError &&
        error.status === 409 &&
        error.message.includes(APPOINTMENT_SCOPE_CONFLICT_MESSAGE)
      ) {
        const extras = (error.extras ?? {}) as CreateAppointmentConflict;
        const conflicting = extras.conflictingAppointment;
        const position = positions.find((candidate) => candidate.id === extras.positionId);
        setCreateAppointmentConflict({
          appointmentName: position?.displayName ?? "Selected appointment",
          scopeType: (extras.scopeType as "GLOBAL" | "PLATOON" | undefined) ?? "GLOBAL",
          scopeId: (extras.scopeId as string | null | undefined) ?? null,
          currentHolder: conflicting
            ? {
                id: conflicting.id,
                userId: conflicting.userId,
                username: conflicting.username,
                startsAt: conflicting.startsAt,
                endsAt: conflicting.endsAt,
              }
            : null,
        });
        return;
      }

      setCreateAppointmentConflict(null);
      const message = error?.message || "Failed to create appointment";
      toast.error(message);
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
      const appointmentPayload: UpdateAppointmentPayload = {
        startsAt: payload.startsAt,
        userId: payload.userId,
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

      return await deleteAppointment(appointmentId);
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
      setCreateAppointmentConflict(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["platoons"] });
    },
    createAppointmentConflict,
    clearCreateAppointmentConflict: () => setCreateAppointmentConflict(null),
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
