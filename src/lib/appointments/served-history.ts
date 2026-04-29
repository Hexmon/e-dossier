import type { Appointment } from "@/app/lib/api/appointmentApi";

export interface ServedHistoryEntry {
  id: string;
  user: string;
  appointment: string;
  fromDate: string;
  toDate: string;
}

export function buildServedHistory(appointments: Appointment[]): ServedHistoryEntry[] {
  return [...appointments]
    .filter((appointment) => Boolean(appointment.endsAt))
    .sort((left, right) => {
      const leftTime = left.endsAt ? new Date(left.endsAt).getTime() : 0;
      const rightTime = right.endsAt ? new Date(right.endsAt).getTime() : 0;
      return rightTime - leftTime;
    })
    .map((appointment) => ({
      id: appointment.id,
      user: appointment.username || "Unknown",
      appointment: appointment.positionName || "N/A",
      fromDate: appointment.startsAt,
      toDate: appointment.endsAt as string,
    }));
}
