"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

import type { InspFormData } from "@/types/dossierInsp";
import { saveInspForm, clearInspForm } from "@/store/slices/inspSheetSlice";
import type { RootState } from "@/store";
import { useDebounce } from "@/hooks/useDebounce";

interface Props {
  ocId: string;
}

export default function InspFormComponent({ ocId }: Props) {
  const dispatch = useDispatch();

  /* ✅ Redux Persist – KEEP */
  const savedData = useSelector(
    (state: RootState) => state.inspSheet.forms[ocId]
  );

  const form = useForm<InspFormData>({
    defaultValues: {
      date: "",
      rk: "",
      name: "",
      appointment: "",
      remarks: "",
      initials: "",
    },
  });

  const { register, handleSubmit, reset, watch } = form;

  /* Load persisted data */
  useEffect(() => {
    if (savedData) {
      reset(savedData);
    }
  }, [savedData, reset]);

  /* Auto-save (Redux Persist) */
  const debouncedValues = useDebounce(watch(), 500);

  useEffect(() => {
    if (!debouncedValues) return;

    const hasData = Object.values(debouncedValues).some(
      v => v !== "" && v !== null && v !== undefined
    );

    if (hasData) {
      dispatch(saveInspForm({ ocId, data: debouncedValues }));
    }
  }, [debouncedValues, dispatch, ocId]);

  const onSubmit = (data: InspFormData) => {
    if (!data.name?.trim()) {
      toast.error("Name is required");
      return;
    }

    dispatch(saveInspForm({ ocId, data }));
    toast.success("Inspection submitted successfully");
  };

  const handleReset = () => {
    if (!confirm("Clear all inspection data?")) return;

    reset({
      date: "",
      rk: "",
      name: "",
      appointment: "",
      remarks: "",
      initials: "",
    });

    dispatch(clearInspForm(ocId));
    toast.info("Form cleared");
  };

  const renderPreview = (data: InspFormData | null) => {
    if (!data) {
      return <p className="italic text-gray-500">No inspection saved yet.</p>;
    }

    const rows: Array<[string, string]> = [
      ["Date", data.date || "-"],
      ["Rank", data.rk || "-"],
      ["Name", data.name || "-"],
      ["Appointment", data.appointment || "-"],
      ["Remarks", data.remarks || "-"],
      ["Initials", data.initials || "-"],
    ];

    return (
      <div className="grid grid-cols-2 gap-4 text-sm">
        {rows.map(([label, val]) => (
          <p key={label}>
            <strong>{label}:</strong> {val}
          </p>
        ))}
      </div>
    );
  };

  return (
    <Card className="max-w-4xl mx-auto shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-center">
          Inspection Sheet
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="fill">
          <TabsList className="mb-6">
            <TabsTrigger value="fill">Fill Form</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          {/* FORM TAB */}
          <TabsContent value="fill">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="text-xs text-gray-500 text-right">
                ✓ Changes are saved automatically
              </div>

              <Input type="date" {...register("date")} />
              <Input placeholder="Rank" {...register("rk")} />
              <Input placeholder="Name" {...register("name")} />
              <Input placeholder="Appointment" {...register("appointment")} />
              <Textarea placeholder="Remarks" {...register("remarks")} />
              <Textarea placeholder="Initials" {...register("initials")} />

              <div className="flex justify-center gap-2">
                <Button variant="outline" type="button" onClick={handleReset}>
                  Clear Form
                </Button>
                <Button type="submit">Submit</Button>
              </div>
            </form>
          </TabsContent>

          {/* PREVIEW TAB */}
          <TabsContent value="preview">
            <div className="p-6 bg-gray-50 border rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Preview</h3>
              {renderPreview(savedData ?? null)}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
