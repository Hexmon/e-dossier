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
import { Card, CardTitle } from "../ui/card";

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
      row.date === next.date &&
      row.rk === next.rk &&
      row.name === next.name &&
      row.appointment === next.appointment &&
      row.remarks === next.remarks &&
      row.initials === next.initials
    );
  });
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

  // Map API inspections to InspFormData for display and avoid writing identical form state.
  useEffect(() => {
    const mapped = inspections.map((insp) => {
      const app = appointments.find((a) => a.userId === insp.inspector.id);
      return {
        id: insp.id,
        date: insp.date,
        rk: insp.inspector.rank,
        name: insp.inspector.name,
        appointment: app?.positionName || insp.inspector.appointment || "",
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
  }, [inspections, appointments, getValues, setValue]);

  //Reset form whenever defaultValues change
  useEffect(() => {
    if (defaultValues) {
      reset(defaultValues);
    }
  }, [defaultValues, reset]);

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
      const user = users.find((u) => u.name === updatedRow.name);
      if (!user) {
        toast.error(`User ${updatedRow.name} not found.`);
        return;
      }

      const data = {
        inspectorUserId: user.id!,
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
      const user = users.find((u) => u.name === row.name);
      if (!user) {
        toast.error(`User ${row.name} not found.`);
        return;
      }

      const data: CreateInspectionData = {
        inspectorUserId: user.id!,
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
                            field.onChange(val);
                            const user = users.find(u => u.name === val);
                            if (user) {
                              setValue(`inspections.${idx}.rk`, user.rank || '');
                              setValue(`inspections.${idx}.initials`, `${user.rank} ${user.name}` || '');
                              const app = appointments.find(a => a.userId === user.id);
                              setValue(`inspections.${idx}.appointment`, app?.positionName || '');
                            }
                          }} value={field.value || undefined}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Inspector" />
                            </SelectTrigger>
                            <SelectContent>
                              {users.map((user) => (
                                <SelectItem key={user.id} value={user.name}>
                                  {user.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </td>
                    <td className="p-2 border">
                      <Input
                        {...register(`inspections.${idx}.rk` as any)}
                        placeholder="Rank"
                        disabled
                      />
                    </td>
                    <td className="p-2 border">
                      <Input
                        {...register(`inspections.${idx}.appointment` as any)}
                        placeholder="Appointment"
                        disabled
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
