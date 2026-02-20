"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRelegationActions, useRelegationModule } from "@/hooks/useRelegation";
import { ApiClientError } from "@/app/lib/apiClient";
import type { RelegationTransferResponse } from "@/app/lib/api/relegationApi";

interface RelegationFormValues {
  ocId: string;
  ocName: string;
  courseNo: string;
  currentCourseId: string;
  transferTo: string;
  reason: string;
  remark: string;
  pdfFile: FileList | null;
}

type RelegationFormMode = "transfer" | "promotion-exception";

type RelegationFormPrefill = {
  ocId: string;
  ocName: string;
  currentCourseId: string;
  currentCourseCode: string;
  transferToCourseId?: string;
};

type RelegationFormProps = {
  mode?: RelegationFormMode;
  prefill?: RelegationFormPrefill;
  lockOcSelection?: boolean;
  lockTransferTo?: boolean;
  submitLabel?: string;
  className?: string;
  onSuccess?: (transfer: RelegationTransferResponse["transfer"]) => void;
};

function parseApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    return error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

export default function RelegationForm({
  mode = "transfer",
  prefill,
  lockOcSelection = false,
  lockTransferTo = false,
  submitLabel,
  className,
  onSuccess,
}: RelegationFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    resetField,
    watch,
    formState: { errors },
  } = useForm<RelegationFormValues>({
    defaultValues: {
      ocId: "",
      ocName: "",
      courseNo: "",
      currentCourseId: "",
      transferTo: "",
      reason: "",
      remark: "",
      pdfFile: null,
    },
  });

  const selectedOcId = watch("ocId");
  const currentCourseId = watch("currentCourseId");

  const { ocOptionsQuery, nextCoursesQuery, presignMutation, transferMutation } =
    useRelegationModule(currentCourseId || null);
  const { exceptionMutation } = useRelegationActions();

  const ocOptions = ocOptionsQuery.data ?? [];
  const transferOptions = nextCoursesQuery.data ?? [];
  const [ocNameSearch, setOcNameSearch] = useState("");
  const [isOcNameDropdownOpen, setIsOcNameDropdownOpen] = useState(false);
  const ocNameDropdownRef = useRef<HTMLDivElement>(null);

  const isBusy =
    presignMutation.isPending || transferMutation.isPending || exceptionMutation.isPending;

  const selectedOc = useMemo(
    () => ocOptions.find((item) => item.ocId === selectedOcId) ?? null,
    [ocOptions, selectedOcId]
  );

  useEffect(() => {
    setOcNameSearch(selectedOc?.ocName ?? "");
  }, [selectedOc?.ocName]);

  useEffect(() => {
    if (!prefill) return;
    reset({
      ocId: prefill.ocId,
      ocName: prefill.ocName,
      courseNo: prefill.currentCourseCode,
      currentCourseId: prefill.currentCourseId,
      transferTo: prefill.transferToCourseId ?? "",
      reason: "",
      remark: "",
      pdfFile: null,
    });
    setValue("ocId", prefill.ocId, { shouldDirty: false, shouldValidate: true });
    setOcNameSearch(prefill.ocName);
  }, [prefill, reset, setValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        ocNameDropdownRef.current &&
        !ocNameDropdownRef.current.contains(event.target as Node)
      ) {
        setIsOcNameDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOcOptions = useMemo(() => {
    const query = ocNameSearch.trim().toLowerCase();
    const results = query
      ? ocOptions.filter(
          (oc) =>
            oc.ocName.toLowerCase().includes(query) || oc.ocNo.toLowerCase().includes(query)
        )
      : ocOptions;

    return results.slice(0, 50);
  }, [ocNameSearch, ocOptions]);

  const handleOcSelect = (ocId: string) => {
    const option = ocOptions.find((item) => item.ocId === ocId);
    setValue("ocId", ocId, { shouldValidate: true, shouldDirty: true });
    setValue("transferTo", "", { shouldDirty: true });

    if (!option) {
      setValue("ocName", "");
      setValue("courseNo", "");
      setValue("currentCourseId", "");
      return;
    }

    setValue("ocName", option.ocName, { shouldDirty: true });
    setValue("courseNo", option.currentCourseCode, { shouldDirty: true });
    setValue("currentCourseId", option.currentCourseId, { shouldDirty: true });
    setOcNameSearch(option.ocName);
    setIsOcNameDropdownOpen(false);
  };

  const onSubmit: SubmitHandler<RelegationFormValues> = async (formData) => {
    try {
      let pdfObjectKey: string | null = null;
      let pdfUrl: string | null = null;

      const file = formData.pdfFile?.[0];
      if (file) {
        const presign = await presignMutation.mutateAsync({
          fileName: file.name,
          contentType: "application/pdf",
          sizeBytes: file.size,
        });

        const uploadResponse = await fetch(presign.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/pdf",
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text().catch(() => "");
          const suffix = errorText ? ` ${errorText.slice(0, 200)}` : "";
          throw new Error(
            `PDF upload failed (${uploadResponse.status} ${uploadResponse.statusText}).${suffix}`
          );
        }

        pdfObjectKey = presign.objectKey;
        pdfUrl = presign.publicUrl;
      }

      const payload = {
        ocId: formData.ocId,
        toCourseId: formData.transferTo,
        reason: formData.reason.trim(),
        remark: formData.remark?.trim() ? formData.remark.trim() : null,
        pdfObjectKey,
        pdfUrl,
      };

      const response =
        mode === "promotion-exception"
          ? await exceptionMutation.mutateAsync(payload)
          : await transferMutation.mutateAsync(payload);

      const transfer = response.transfer;
      setValue("courseNo", transfer.toCourse.courseCode, { shouldDirty: false });
      setValue("currentCourseId", transfer.toCourse.courseId, { shouldDirty: false });

      if (mode === "transfer") {
        setValue("transferTo", "", { shouldDirty: false });
      }

      setValue("reason", "", { shouldDirty: false });
      setValue("remark", "", { shouldDirty: false });
      resetField("pdfFile");

      const successMessage =
        mode === "promotion-exception"
          ? `OC ${transfer.oc.ocNo} marked as promotion exception.`
          : `OC ${transfer.oc.ocNo} transferred from ${transfer.fromCourse.courseCode} to ${transfer.toCourse.courseCode}.`;
      toast.success(successMessage);
      onSuccess?.(transfer);
    } catch (error) {
      toast.error(parseApiError(error, "Failed to submit relegation request."));
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={
        className ??
        "w-full space-y-6 rounded-2xl border border-border bg-card p-4 shadow-sm lg:max-w-2xl"
      }
    >
      <div className="space-y-2">
        <Label htmlFor="ocId">OC No</Label>
        <Controller
          name="ocId"
          control={control}
          rules={{ required: "OC selection is required" }}
          render={({ field }) => (
            <Select
              value={field.value || undefined}
              onValueChange={(value) => {
                field.onChange(value);
                handleOcSelect(value);
              }}
              disabled={ocOptionsQuery.isLoading || isBusy || lockOcSelection}
            >
              <SelectTrigger id="ocId">
                <SelectValue placeholder="Select OC" />
              </SelectTrigger>
              <SelectContent>
                {ocOptions.map((oc) => (
                  <SelectItem key={oc.ocId} value={oc.ocId}>
                    {`${oc.ocNo} | ${oc.ocName} | Active: ${oc.isActive ? "Yes" : "No"}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.ocId ? <p className="text-sm text-destructive">{errors.ocId.message}</p> : null}
        {ocOptionsQuery.isError ? (
          <p className="text-sm text-destructive">
            {parseApiError(ocOptionsQuery.error, "Failed to load OC options.")}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ocName">Name of the OC</Label>
        <div ref={ocNameDropdownRef} className="relative">
          <Input
            id="ocName"
            placeholder="Search OC name"
            value={ocNameSearch}
            onChange={(event) => {
              setOcNameSearch(event.target.value);
              setIsOcNameDropdownOpen(true);
            }}
            onFocus={() => setIsOcNameDropdownOpen(true)}
            disabled={ocOptionsQuery.isLoading || isBusy || lockOcSelection}
          />
          {isOcNameDropdownOpen && !lockOcSelection && (
            <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-md">
              {filteredOcOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No OC found.</div>
              ) : (
                filteredOcOptions.map((oc) => (
                  <button
                    key={oc.ocId}
                    type="button"
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handleOcSelect(oc.ocId)}
                  >
                    <span>{oc.ocName}</span>
                    <span className="text-xs text-muted-foreground">{`${oc.ocNo} | Active: ${oc.isActive ? "Yes" : "No"}`}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="courseNo">Current Course</Label>
        <Input id="courseNo" {...register("courseNo")} disabled />
      </div>

      <div className="space-y-2">
        <Label htmlFor="transferTo">Transfer To</Label>
        <Controller
          name="transferTo"
          control={control}
          rules={{ required: "Transfer target is required" }}
          render={({ field }) => (
            <Select
              value={field.value || undefined}
              onValueChange={field.onChange}
              disabled={
                !selectedOc || nextCoursesQuery.isLoading || isBusy || lockTransferTo || !currentCourseId
              }
            >
              <SelectTrigger id="transferTo">
                <SelectValue placeholder="Select target course" />
              </SelectTrigger>
              <SelectContent>
                {transferOptions.map((course) => (
                  <SelectItem key={course.courseId} value={course.courseId}>
                    {`${course.courseCode} | ${course.courseName}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.transferTo ? (
          <p className="text-sm text-destructive">{errors.transferTo.message}</p>
        ) : null}
        {selectedOc && !nextCoursesQuery.isLoading && transferOptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No immediate next course available for current course.
          </p>
        ) : null}
        {nextCoursesQuery.isError ? (
          <p className="text-sm text-destructive">
            {parseApiError(nextCoursesQuery.error, "Failed to load transfer options.")}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Reason</Label>
        <Textarea
          id="reason"
          rows={4}
          {...register("reason", {
            required: "Reason is required",
            minLength: { value: 2, message: "Reason must be at least 2 characters" },
          })}
          placeholder="Enter reason"
          disabled={isBusy}
        />
        {errors.reason ? <p className="text-sm text-destructive">{errors.reason.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="remark">Remarks (Optional)</Label>
        <Textarea
          id="remark"
          rows={4}
          {...register("remark")}
          placeholder="Enter remarks"
          disabled={isBusy}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pdfFile">Choose PDF</Label>
        <Input
          id="pdfFile"
          type="file"
          accept="application/pdf"
          {...register("pdfFile")}
          disabled={isBusy}
        />
      </div>

      <Button type="submit" disabled={isBusy} className="w-full cursor-pointer">
        {isBusy
          ? mode === "promotion-exception"
            ? "Saving Exception..."
            : "Submitting..."
          : submitLabel ?? (mode === "promotion-exception" ? "Save Exception" : "Submit")}
      </Button>
    </form>
  );
}
