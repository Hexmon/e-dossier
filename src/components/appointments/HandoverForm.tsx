"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User } from "@/app/lib/api/userApi";
import { Appointment } from "@/app/lib/api/appointmentApi";
import { UseFormRegister, UseFormHandleSubmit, UseFormWatch } from "react-hook-form";

interface HandoverFormProps {
  appointment: Appointment | null;
  users: User[];
  register: UseFormRegister<{
    toUser: string;
    handoverDate: string;
    takeoverDate: string;
  }>;
  handleSubmit: UseFormHandleSubmit<{
    toUser: string;
    handoverDate: string;
    takeoverDate: string;
  }>;
  watch: UseFormWatch<{
    toUser: string;
    handoverDate: string;
    takeoverDate: string;
  }>;
  onSubmit: (values: {
    toUser: string;
    handoverDate: string;
    takeoverDate: string;
  }) => void;
  submitting: boolean;
}

export function HandoverForm({
  appointment,
  users,
  register,
  handleSubmit,
  watch,
  onSubmit,
  submitting,
}: HandoverFormProps) {
  const watchedHandover = watch("handoverDate") || "";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <fieldset>
        <label className="text-sm font-medium">From User</label>
        <Input value={appointment?.username ?? "N/A"} disabled />

        <label className="text-sm font-medium mt-4">To User</label>
        <select
          {...register("toUser", { required: true })}
          className="w-full border rounded-md p-2 text-sm bg-background"
        >
          <option value="">Select user</option>

          {users.map(({ id, name, username }) => (
            <option key={id} value={id}>
              {name} ({username})
            </option>
          ))}
        </select>

        <label className="text-sm font-medium mt-4">Handing Over Date</label>
        <Input
          type="date"
          {...register("handoverDate", { required: true })}
          min={new Date().toISOString().split("T")[0]}
        />

        <label className="text-sm font-medium mt-4">Taking Over Date</label>
        <Input
          type="date"
          {...register("takeoverDate", { required: true })}
          min={watchedHandover || new Date().toISOString().split("T")[0]}
        />
      </fieldset>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit"}
        </Button>
      </div>
    </form>
  );
}
