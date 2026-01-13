"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import InspTable from "./InspTable";
import type { InspFormData } from "@/types/dossierInsp";

interface Props {
  onSubmit?: (data: { inspections: InspFormData[] }) => void;
  disabled?: boolean;
  defaultValues?: { inspections: InspFormData[]; savedData: InspFormData[] };
}

export default function InspFormComponent({ onSubmit, disabled = false, defaultValues }: Props) {
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

  //Reset form whenever defaultValues change
  useEffect(() => {
    if (defaultValues) {
      reset(defaultValues);
    }
  }, [defaultValues, reset]);

  const handleDeleteFromTable = (index: number) => {
    const currentSavedData = getValues("savedData");
    const newSavedData = currentSavedData.filter((_, i) => i !== index);
    setValue("savedData", newSavedData);
    toast.success("Record deleted.");
  };

  const handleUpdateFromTable = (index: number, updatedRow: InspFormData) => {
    const currentSavedData = getValues("savedData");
    const newSavedData = currentSavedData.map((row, i) =>
      i === index ? updatedRow : row
    );
    setValue("savedData", newSavedData);
  };

  const handleSave = () => {
    const inspections = getValues("inspections");
    const validRows = inspections.filter((row) => row.name && row.name.trim());

    if (validRows.length === 0) {
      toast.error("At least one row must have a name.");
      return;
    }

    const currentSavedData = getValues("savedData");
    const updatedSavedData = [...currentSavedData, ...validRows];
    setValue("savedData", updatedSavedData);
    toast.success(`${validRows.length} inspection(s) saved.`);

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
      savedData: updatedSavedData,
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
    <form onSubmit={handleSubmit(onFormSubmit)}>
      {/* Table Component */}
      <InspTable 
        data={savedData} 
        onDelete={handleDeleteFromTable}
        onUpdate={handleUpdateFromTable}
      />

      {/* Form Table */}
      <div className="overflow-x-auto border rounded-lg shadow">
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">S No</th>
              <th className="p-2 border">Date</th>
              <th className="p-2 border">Rank</th>
              <th className="p-2 border">Name</th>
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
                    <Input value={String(idx + 1)} disabled className="bg-gray-100 text-center" />
                  </td>
                  <td className="p-2 border">
                    <Input
                      {...register(`inspections.${idx}.date` as any)}
                      type="date"
                    />
                  </td>
                  <td className="p-2 border">
                    <Input
                      {...register(`inspections.${idx}.rk` as any)}
                      placeholder="Rank"
                    />
                  </td>
                  <td className="p-2 border">
                    <Input
                      {...register(`inspections.${idx}.name` as any)}
                      placeholder="Name"
                    />
                  </td>
                  <td className="p-2 border">
                    <Input
                      {...register(`inspections.${idx}.appointment` as any)}
                      placeholder="Appointment"
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

        <Button type="button" className="bg-green-600 hover:bg-green-700" onClick={handleSave} disabled={disabled}>
          {disabled ? "Submitting..." : "Submit"}
        </Button>

        <Button type="button" variant="outline" onClick={handleReset} disabled={disabled}>
          Reset
        </Button>
      </div>
    </form>
  );
}