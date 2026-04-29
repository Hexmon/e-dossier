"use client";

import { ServedUser } from "@/hooks/useAppointments";

interface ServedHistoryTableProps {
  servedList: ServedUser[];
}

export function ServedHistoryTable({ servedList }: ServedHistoryTableProps) {
  const formatDate = (value: string) => new Date(value).toLocaleDateString();

  return (
    <section className="overflow-x-auto border rounded-md">
      <table className="w-full text-sm text-left">
        <thead className="bg-muted text-foreground">
          <tr>
            <th className="px-4 py-2">User & Appointment</th>
            <th className="px-4 py-2">From</th>
            <th className="px-4 py-2">To</th>
          </tr>
        </thead>

        <tbody>
          {servedList.length === 0 ? (
            <tr>
              <td colSpan={3} className="text-center p-4 text-muted-foreground">
                No served history available.
              </td>
            </tr>
          ) : (
            servedList.map(({ id, user, appointment, fromDate, toDate }) => (
              <tr key={id} className="border-t">
                <td className="px-4 py-2 font-medium">
                  {user} ({appointment})
                </td>
                <td className="px-4 py-2">{formatDate(fromDate)}</td>
                <td className="px-4 py-2">{formatDate(toDate)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
