"use client";

import { useCallback, useState } from "react";
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
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [servedList, setServedList] = useState<ServedUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [platoons, setPlatoons] = useState<Platoon[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
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


  /** ------------------ FETCH USERS AND POSITIONS FOR CREATE DIALOG ------------------ */
  const fetchUsersAndPositions = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, positionsData, platoonsData] = await Promise.all([
        getAllUsers(),
        getPositions(),
        getPlatoons(),
      ]);
      setUsers(usersData);
      setPositions(positionsData);
      setPlatoons(platoonsData);
    } catch {
      toast.error("Unable to load users and positions, using fallback.");
      setUsers(fallbackUsers);
      setPositions([]);
      setPlatoons([]);
    } finally {
      setLoading(false);
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

  /** ------------------ CREATE NEW APPOINTMENT ------------------ */
  const createNewAppointment = useCallback(
    async (formData: {
      userId: string;
      appointmentName: string;
      startsAt: string;
      isPlatoonCommander?: boolean;
      platoonId?: string;
      scopeType?: "GLOBAL" | "PLATOON";
    }) => {
      try {
        // Step 1: Create new position with appointment name as displayName
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

        // Step 2: Create appointment with the new position
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

        const response = await createAppointment(payload);

        if (response && response.data) {
          toast.success("Appointment created successfully!");
          // Refresh appointments list
          await fetchAppointments();
          return true;
        }
        return false;
      } catch (error: any) {
        toast.error(
          error.message ||
            "Failed to create appointment. Please check your inputs and try again."
        );
        return false;
      }
    },
    [fetchAppointments]
  );

  /** ------------------ UPDATE APPOINTMENT ------------------ */
  const handleEditAppointment = useCallback(
    async (appointmentId: string, payload: UpdateAppointmentPayload & { positionId?: string; positionName?: string }) => {
      try {
        // Find the selected user's username if userId is being changed
        let newUsername: string | undefined;
        if (payload.userId) {
          const selectedUser = users.find((u) => u.id === payload.userId);
          newUsername = selectedUser?.username;
        }

        // Separate appointment and position updates
        const appointmentPayload: UpdateAppointmentPayload = {
          startsAt: payload.startsAt,
          userId: payload.userId,
          ...(newUsername && { username: newUsername }),
        };

        // Update appointment (date, user, and username)
        const appointmentPromise = updateAppointment(appointmentId, appointmentPayload);
        
        // Update position displayName if provided
        let positionPromise = Promise.resolve({ data: null } as any);
        if (payload.positionId && payload.positionName) {
          positionPromise = updatePosition(payload.positionId, {
            displayName: payload.positionName,
          });
        }

        // Wait for both updates
        const [appointmentResponse] = await Promise.all([
          appointmentPromise,
          positionPromise,
        ]);

        if (appointmentResponse && appointmentResponse.data) {
          toast.success("Appointment updated successfully!");
          // Refresh appointments list from database
          await fetchAppointments();
          return true;
        }
        return false;
      } catch (error: any) {
        toast.error(error.message || "Failed to update appointment. Please try again.");
        return false;
      }
    },
    [fetchAppointments, users]
  );

  /** ------------------ DELETE APPOINTMENT ------------------ */
  const handleDeleteAppointment = useCallback(
    async (appointmentId: string) => {
      try {
        // Delete the appointment first
        const appointment = appointments.find(a => a.id === appointmentId);
      if (!appointment) {
        throw new Error("Appointment not found");
      }
      
        const response = await deleteAppointment(appointmentId);
        
        if (response && response.data) {
          // Delete the associated position if positionId is provided
          // This is to avoid orphaned positions
          if (appointment.positionId) {
            try {
              await deletePosition(appointment.positionId);
            } catch (positionError: any) {
              // Don't fail the entire operation if position deletion fails
              console.error(positionError); 
            }
          }
          
          toast.success("Appointment deleted successfully!");
          // Refresh appointments list
          await fetchAppointments();
          return true;
        }
        return false;
      } catch (error: any) {
        toast.error(error.message || "Failed to delete appointment. Please try again.");
        return false;
      }
    },
    [fetchAppointments, appointments]
  );

  return {
    appointments,
    servedList,
    users,
    positions,
    platoons,
    loading,
    error,
    fetchAppointments,
    fetchUsers,
    fetchUsersAndPositions,
    handleHandover,
    createNewAppointment,
    handleEditAppointment,
    handleDeleteAppointment,
  };
}