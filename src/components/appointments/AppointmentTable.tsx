"use client";

import { Appointment } from "@/app/lib/api/appointmentApi";
import { Button } from "@/components/ui/button";

interface AppointmentTableProps {
  appointments: Appointment[];
  onHandover: (appointment: Appointment) => void;
  loading: boolean;
}

export function AppointmentTable({
  appointments,
  onHandover,
  loading,
}: AppointmentTableProps) {
  if (loading) {
    return (
      <p className="text-center text-muted-foreground p-4">
        Loading appointments…
      </p>
    );
  }

  if (appointments.length === 0) {
    return (
      <p className="text-center text-muted-foreground p-4">
        No appointments found.
      </p>
    );
  }

  return (
    <section className="overflow-x-auto border rounded-md">
      <table className="w-full text-sm text-left">
        <thead className="bg-muted text-foreground">
          <tr>
            <th className="px-4 py-2">Appointment</th>
            <th className="px-4 py-2">Username</th>
            <th className="px-4 py-2">From</th>
            <th className="px-4 py-2 text-center">Action</th>
          </tr>
        </thead>

        <tbody>
          {appointments.map(
            ({ id, positionName, username, startsAt }) => (
              <tr key={id} className="border-t">
                <td className="px-4 py-2 font-medium">
                  {positionName || "N/A"}
                </td>

                <td className="px-4 py-2">{username || "Unknown"}</td>

                <td className="px-4 py-2">
                  {new Date(startsAt).toLocaleDateString()}
                </td>

                <td className="px-4 py-2 text-center">
                  <Button variant="outline" onClick={() => onHandover({ id, positionName, username, startsAt } as Appointment)}>
                    Handing Over
                  </Button>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </section>
  );
}
