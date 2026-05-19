"use client";

import { useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

import InspTable from "./InspTable";
import type { InspFormData } from "@/types/dossierInsp";
import { useDossierInspections, CreateInspectionData } from "@/hooks/useDossierInspections";
import { useUsers } from "@/hooks/useUsers";
import { useAppointments } from "@/hooks/useAppointments";
import type { Appointment } from "@/app/lib/api/appointmentApi";
import type { User } from "@/app/lib/api/userApi";
import { Card, CardTitle } from "../ui/card";

const MANUAL_INSPECTOR_VALUE = "__manual_inspector__";

interface Props {
  ocId: string;
  onSubmit?: (data: { inspections: InspFormData[] }) => void;
  disabled?: boolean;
  defaultValues?: { inspections: InspFormData[]; savedData: InspFormData[] };
}

function areInspectionRowsEqual(a: InspFormData[], b: InspFormData[]) {
  if (a.length !== b.length) return false;

  return a.every((row, index) => {
    const next = b[index];
    if (!next) return false;

    return (
      row.id === next.id &&
      row.inspectorUserId === next.inspectorUserId &&
      row.manualInspector === next.manualInspector &&
      row.date === next.date &&
      row.rk === next.rk &&
      row.name === next.name &&
      row.appointment === next.appointment &&
      row.remarks === next.remarks &&
      row.initials === next.initials
    );
  });
}

function getUserAppointmentName(user: User | undefined, appointments: Appointment[]) {
  return (
    user?.activeAppointments?.[0]?.positionName ||
    appointments.find((appointment) => appointment.userId === user?.id)?.positionName ||
    ""
  );
}

export default function InspFormComponent({ ocId, onSubmit, disabled = false, defaultValues }: Props) {
  const { inspections, loading, createInspection, updateInspection, deleteInspection } = useDossierInspections(ocId);
  const { users, loading: usersLoading } = useUsers();
  const { appointments } = useAppointments();

  const form = useForm<{ inspections: InspFormData[]; savedData: InspFormData[] }>({
    defaultValues: defaultValues || {
      inspections: [
        {
          date: "",
          rk: "",
          name: "",
          appointment: "",
          remarks: "",
          initials: "",
          inspectorUserId: null,
          manualInspector: false,
        },
      ],
      savedData: [],
    },
  });

  const { control, handleSubmit, register, reset, watch, setValue, getValues } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "inspections",
  });

  const savedData = watch("savedData");
  const draftInspections = watch("inspections");

  // Map API inspections to InspFormData for display and avoid writing identical form state.
  useEffect(() => {
    const mapped = inspections.map((insp) => {
      const user = users.find((item) => item.id === insp.inspector.id);
      return {
        id: insp.id,
        inspectorUserId: insp.inspector.id,
        manualInspector: !insp.inspector.id,
        date: insp.date,
        rk: insp.inspector.rank,
        name: insp.inspector.name,
        appointment: getUserAppointmentName(user, appointments) || insp.inspector.appointment || "",
        remarks: insp.remarks || "",
        initials: insp.initials,
      };
    });

    const current = getValues("savedData");
    if (areInspectionRowsEqual(current, mapped)) return;

    setValue("savedData", mapped, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [inspections, users, appointments, getValues, setValue]);

  //Reset form whenever defaultValues change
  useEffect(() => {
    if (defaultValues) {
      reset(defaultValues);
    }
  }, [defaultValues, reset]);

  useEffect(() => {
    draftInspections.forEach((row, index) => {
      if (row.manualInspector) return;
      if (!row.name) return;
      const user = users.find((item) => item.id === row.inspectorUserId || item.name === row.name);
      if (!user) return;

      const rank = user.rank || "";
      const initials = `${user.rank || ""} ${user.name}`.trim();
      const appointment = getUserAppointmentName(user, appointments);

      if (row.rk !== rank) {
        setValue(`inspections.${index}.rk`, rank, { shouldDirty: false });
      }
      if (row.initials !== initials) {
        setValue(`inspections.${index}.initials`, initials, { shouldDirty: false });
      }
      if (row.appointment !== appointment) {
        setValue(`inspections.${index}.appointment`, appointment, { shouldDirty: false });
      }
    });
  }, [draftInspections, users, appointments, setValue]);

  const handleDeleteFromTable = async (index: number) => {
    const currentSavedData = getValues("savedData");
    const item = currentSavedData[index];
    if (item.id) {
      const success = await deleteInspection(item.id);
      if (success) {
        const newSavedData = currentSavedData.filter((_, i) => i !== index);
        setValue("savedData", newSavedData);
      }
    }
  };

  const handleUpdateFromTable = async (index: number, updatedRow: InspFormData) => {
    const currentSavedData = getValues("savedData");
    const item = currentSavedData[index];
    if (item.id) {
      const isManual = Boolean(updatedRow.manualInspector || !updatedRow.inspectorUserId);
      const user = users.find((u) => u.id === updatedRow.inspectorUserId || u.name === updatedRow.name);
      if (!isManual && !user) {
        toast.error(`User ${updatedRow.name} not found.`);
        return;
      }
      if (isManual && (!updatedRow.name.trim() || !updatedRow.rk.trim() || !updatedRow.appointment.trim())) {
        toast.error("Manual inspector name, rank, and appointment are required.");
        return;
      }

      const data = {
        inspectorUserId: isManual ? null : user!.id!,
        inspectorName: isManual ? updatedRow.name.trim() : undefined,
        inspectorRank: isManual ? updatedRow.rk.trim() : undefined,
        inspectorAppointment: isManual ? updatedRow.appointment.trim() : undefined,
        date: new Date(updatedRow.date),
        remarks: updatedRow.remarks || undefined,
      };

      const success = await updateInspection(item.id, data);
      if (success) {
        const newSavedData = currentSavedData.map((row, i) =>
          i === index ? { ...updatedRow, id: item.id } : row
        );
        setValue("savedData", newSavedData);
      }
    }
  };

  const handleSave = async () => {
    const formInspections = getValues("inspections");
    const validRows = formInspections.filter((row) => row.name && row.name.trim() && row.date);

    if (validRows.length === 0) {
      toast.error("At least one row must have a name and date.");
      return;
    }

    for (const row of validRows) {
      const isManual = Boolean(row.manualInspector || !row.inspectorUserId);
      const user = users.find((u) => u.id === row.inspectorUserId || u.name === row.name);
      if (!isManual && !user) {
        toast.error(`User ${row.name} not found.`);
        return;
      }
      if (isManual && (!row.name.trim() || !row.rk.trim() || !row.appointment.trim())) {
        toast.error("Manual inspector name, rank, and appointment are required.");
        return;
      }

      const data: CreateInspectionData = {
        inspectorUserId: isManual ? null : user!.id!,
        inspectorName: isManual ? row.name.trim() : undefined,
        inspectorRank: isManual ? row.rk.trim() : undefined,
        inspectorAppointment: isManual ? row.appointment.trim() : undefined,
        date: new Date(row.date),
        remarks: row.remarks || undefined,
      };

      await createInspection(data);
    }

    // Refresh will update savedData via useEffect
    reset({
      inspections: [
        {
          date: "",
          rk: "",
          name: "",
          appointment: "",
          remarks: "",
          initials: "",
          inspectorUserId: null,
          manualInspector: false,
        },
      ],
      savedData: getValues("savedData"),
    });
  };

  const handleReset = () => {
    reset({
      inspections: [
        {
          date: "",
          rk: "",
          name: "",
          appointment: "",
          remarks: "",
          initials: "",
          inspectorUserId: null,
          manualInspector: false,
        },
      ],
      savedData: getValues("savedData"),
    });
    toast.info("Form reset.");
  };

  const onFormSubmit = (data: { inspections: InspFormData[]; savedData: InspFormData[] }) => {
    if (onSubmit) {
      onSubmit({ inspections: data.savedData });
    }
  };

  const addRow = () =>
    append({
      date: "",
      rk: "",
      name: "",
      appointment: "",
      remarks: "",
      initials: "",
      inspectorUserId: null,
      manualInspector: false,
    });

  return (
    <Card>
      <form onSubmit={handleSubmit(onFormSubmit)}>
        {/* Table Component */}
        <InspTable
          data={savedData}
          onDelete={handleDeleteFromTable}
          onUpdate={handleUpdateFromTable}
        />

        {/* Form Table */}

        <div className="overflow-x-auto border rounded-lg shadow mt-2">
          <CardTitle className="text-xl text-center font-semibold p-4">Add  Inspection Records</CardTitle>
          <table className="w-full border text-sm">
            <thead className="bg-muted/70">
              <tr>
                <th className="p-2 border">S No</th>
                <th className="p-2 border">Date</th>
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Rank</th>
                <th className="p-2 border">Appointment</th>
                <th className="p-2 border">Remarks</th>
                <th className="p-2 border">Initials</th>
                <th className="p-2 border text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {fields.map((field, idx) => {
                const row = draftInspections[idx];
                const isManual = Boolean(row?.manualInspector);
                return (
                  <tr key={field.id}>
                    <td className="p-2 border text-center">
                      <Input value={String(idx + 1)} disabled className="bg-muted/70 text-center" />
                    </td>
                    <td className="p-2 border">
                      <Input
                        {...register(`inspections.${idx}.date` as any)}
                        type="date"
                      />
                    </td>
                    <td className="p-2 border">
                      <Controller
                        name={`inspections.${idx}.name`}
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={(val) => {
                            if (val === MANUAL_INSPECTOR_VALUE) {
                              setValue(`inspections.${idx}.manualInspector`, true, { shouldDirty: true });
                              setValue(`inspections.${idx}.inspectorUserId`, null, { shouldDirty: true });
                              setValue(`inspections.${idx}.name`, "", { shouldDirty: true });
                              setValue(`inspections.${idx}.rk`, "", { shouldDirty: true });
                              setValue(`inspections.${idx}.appointment`, "", { shouldDirty: true });
                              setValue(`inspections.${idx}.initials`, "", { shouldDirty: true });
                              return;
                            }
                            const user = users.find(u => u.id === val);
                            if (user) {
                              field.onChange(user.name);
                              setValue(`inspections.${idx}.manualInspector`, false, { shouldDirty: true });
                              setValue(`inspections.${idx}.inspectorUserId`, user.id ?? null, { shouldDirty: true });
                              setValue(`inspections.${idx}.rk`, user.rank || '');
                              setValue(`inspections.${idx}.initials`, `${user.rank} ${user.name}` || '');
                              setValue(`inspections.${idx}.appointment`, getUserAppointmentName(user, appointments));
                            }
                          }} value={isManual ? MANUAL_INSPECTOR_VALUE : row?.inspectorUserId || undefined}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Inspector" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={MANUAL_INSPECTOR_VALUE}>Manual entry</SelectItem>
                              {users.map((user) => (
                                <SelectItem key={user.id} value={user.id!}>
                                  {user.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {isManual ? (
                        <Input className="mt-2" {...register(`inspections.${idx}.name` as any)} placeholder="Inspector name" />
                      ) : null}
                    </td>
                    <td className="p-2 border">
                      <Input
                        {...register(`inspections.${idx}.rk` as any)}
                        placeholder="Rank"
                        disabled={!isManual}
                      />
                    </td>
                    <td className="p-2 border">
                      <Input
                        {...register(`inspections.${idx}.appointment` as any)}
                        placeholder="Appointment"
                        disabled={!isManual}
                      />
                    </td>
                    <td className="p-2 border">
                      <Input
                        {...register(`inspections.${idx}.remarks` as any)}
                        placeholder="Remarks"
                      />
                    </td>
                    <td className="p-2 border">
                      <Input
                        {...register(`inspections.${idx}.initials` as any)}
                        placeholder="Initials"
                        disabled
                      />
                    </td>
                    <td className="p-2 border text-center">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => remove(idx)}
                        disabled={disabled}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>


        <div className="mt-4 flex justify-center gap-3">
          <Button type="button" onClick={addRow} disabled={disabled}>
            + Add Row
          </Button>

          <Button type="button" className="bg-success hover:bg-success/90" onClick={handleSave} disabled={disabled}>
            {disabled ? "Submitting..." : "Submit"}
          </Button>

          <Button type="button" variant="outline" onClick={handleReset} disabled={disabled}>
            Reset
          </Button>
        </div>
      </form>
    </Card>
  );
}
