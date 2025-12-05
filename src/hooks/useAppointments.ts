"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
  Appointment,
  getAppointments,
  transferAppointment,
  TransferPayload,
} from "@/app/lib/api/appointmentApi";

import { getAllUsers, User } from "@/app/lib/api/userApi";
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
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [servedList, setServedList] = useState<ServedUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /** ------------------ FETCH USERS FOR HANDOVER ------------------ */
  const fetchUsers = useCallback(async () => {
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch {
      toast.error("Unable to load users, using fallback.");
      setUsers(fallbackUsers);
    }
  }, []);

  /** ------------------ FETCH APPOINTMENTS ------------------ */
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAppointments();

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("No appointment data available");
      }

      setAppointments(data);
      setError(null);
    } catch {
      toast.info("Using fallback appointments.");
      setAppointments(fallbackAppointments);
      setError("Using fallback due to API failure.");
    } finally {
      setLoading(false);
    }
  }, []);

  /** ------------------ HANDLE HANDOVER ------------------ */
  const handleHandover = useCallback(
    async (
      appointment: Appointment,
      form: { toUser: string; handoverDate: string; takeoverDate: string }
    ) => {
      const { id, username, startsAt, positionName } = appointment;

      const handover = new Date(`${form.handoverDate}T00:00:00Z`);
      const takeover = new Date(`${form.takeoverDate}T00:00:00Z`);
      const start = new Date(startsAt);

      if (handover <= start) {
        toast.error("Handover must be after the appointment start date.");
        return false;
      }
      if (handover >= takeover) {
        toast.error("Handover must be before takeover date.");
        return false;
      }

      const selectedUser = users.find((u) => u.id === form.toUser);

      const payload: TransferPayload = {
        newUserId: form.toUser,
        prevEndsAt: handover.toISOString(),
        newStartsAt: takeover.toISOString(),
        positionId: appointment.positionId,
        scopeType: appointment.scopeType,
        scopeId:
          appointment.scopeType === "GLOBAL" ? null : appointment.scopeId,
        reason: "Shift handover",
      };

      try {
        await transferAppointment(id, payload);

        const servedEntry: ServedUser = {
          user: username || "Unknown",
          appointment: positionName || "N/A",
          fromDate: startsAt,
          toDate: form.handoverDate,
        };

        setServedList((prev) => [...prev, servedEntry]);

        // Update current appointment owner
        setAppointments((prev) =>
          prev.map((a) =>
            a.id === id
              ? {
                  ...a,
                  username: selectedUser?.username ?? "N/A",
                  startsAt: form.takeoverDate,
                }
              : a
          )
        );

        toast.success("Appointment handed over successfully");
        return true;
      } catch (err) {
        toast.error("Handover failed. Try again.");
        return false;
      }
    },
    [users]
  );

  return {
    appointments,
    servedList,
    users,
    loading,
    error,
    fetchAppointments,
    fetchUsers,
    handleHandover,
  };
}