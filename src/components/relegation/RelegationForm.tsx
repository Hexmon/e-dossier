"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useRelegationActions, useRelegationModule } from "@/hooks/useRelegation";
import { ApiClientError } from "@/app/lib/apiClient";
import type { RelegationTransferMode, RelegationTransferResponse } from "@/app/lib/api/relegationApi";

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
  ocNo?: string;
  ocName: string;
  currentSemester?: number;
  currentCourseId: string;
  currentCourseCode: string;
  transferToCourseId?: string;
};

type RelegationFormProps = {
  mode?: RelegationFormMode;
  prefill?: RelegationFormPrefill;
  prefillOcId?: string | null;
  prefillOcNo?: string | null;
  prefillOcName?: string | null;
  prefillReason?: string;
  initialTransferMode?: RelegationTransferMode;
  lockOcSelection?: boolean;
  lockTransferTo?: boolean;
  lockTransferMode?: boolean;
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
  prefillOcId,
  prefillOcNo,
  prefillOcName,
  prefillReason,
  initialTransferMode = "PREVIOUS_SEMESTER",
  lockOcSelection = false,
  lockTransferTo = false,
  lockTransferMode = false,
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
  const selectedTransferToCourseId = watch("transferTo");
  const [transferMode, setTransferMode] = useState<RelegationTransferMode>(initialTransferMode);
  const targetCourseMode: RelegationTransferMode =
    mode === "transfer" ? transferMode : "PREVIOUS_SEMESTER";

  const { ocOptionsQuery, nextCoursesQuery, presignMutation, cleanupPendingPdfMutation, transferMutation } =
    useRelegationModule(currentCourseId || null, undefined, targetCourseMode);
  const { exceptionMutation } = useRelegationActions();

  const ocOptions = useMemo(() => ocOptionsQuery.data ?? [], [ocOptionsQuery.data]);
  const transferOptions = useMemo(() => nextCoursesQuery.data ?? [], [nextCoursesQuery.data]);
  const resolvedPrefill = useMemo(() => {
    if (prefill) return prefill;
    if (!prefillOcId) return undefined;
    const normalizedPrefillName = prefillOcName?.trim().toLowerCase();
    const oc = ocOptions.find((item) => {
      if (item.ocId === prefillOcId) return true;
      if (prefillOcNo && item.ocNo === prefillOcNo) return true;
      return Boolean(normalizedPrefillName && item.ocName.trim().toLowerCase() === normalizedPrefillName);
    });
    return oc
      ? {
          ocId: oc.ocId,
          ocNo: oc.ocNo,
          ocName: oc.ocName,
          currentSemester: oc.currentSemester,
          currentCourseId: oc.currentCourseId,
          currentCourseCode: oc.currentCourseCode,
        }
      : undefined;
  }, [ocOptions, prefill, prefillOcId, prefillOcName, prefillOcNo]);
  const [ocNameSearch, setOcNameSearch] = useState("");
  const [isOcNameDropdownOpen, setIsOcNameDropdownOpen] = useState(false);
  const [cleanupConfirmed, setCleanupConfirmed] = useState(false);
  const ocNameDropdownRef = useRef<HTMLDivElement>(null);
  const lastTargetCourseErrorRef = useRef<string | null>(null);

  const isBusy =
    presignMutation.isPending ||
    cleanupPendingPdfMutation.isPending ||
    transferMutation.isPending ||
    exceptionMutation.isPending;

  const selectedOc = useMemo(
    () =>
      ocOptions.find((item) => item.ocId === selectedOcId) ??
      (resolvedPrefill && selectedOcId === resolvedPrefill.ocId
        ? {
            ocId: resolvedPrefill.ocId,
            ocNo: resolvedPrefill.ocNo ?? "",
            ocName: resolvedPrefill.ocName,
            status: "ACTIVE",
            isActive: true,
            currentSemester: resolvedPrefill.currentSemester ?? 1,
            platoonId: null,
            platoonKey: null,
            platoonName: null,
            currentCourseId: resolvedPrefill.currentCourseId,
            currentCourseCode: resolvedPrefill.currentCourseCode,
          }
        : null),
    [ocOptions, resolvedPrefill, selectedOcId]
  );
  const selectedTargetCourse = useMemo(
    () => transferOptions.find((item) => item.courseId === selectedTransferToCourseId) ?? null,
    [transferOptions, selectedTransferToCourseId]
  );
  const targetCourseErrorMessage = useMemo(
    () =>
      nextCoursesQuery.isError
        ? parseApiError(nextCoursesQuery.error, "Failed to load target course options.")
        : null,
    [nextCoursesQuery.error, nextCoursesQuery.isError]
  );
  const selectedCurrentSemester = selectedOc?.currentSemester ?? null;
  const isPreviousSemesterMode = mode === "transfer" && transferMode === "PREVIOUS_SEMESTER";
  const isRepeatSemesterMode = mode === "transfer" && transferMode === "REPEAT_SEMESTER";
  const isCleanupSemesterMode = isPreviousSemesterMode || isRepeatSemesterMode;
  const targetSemester =
    selectedCurrentSemester == null
      ? null
      : isPreviousSemesterMode
        ? Math.max(1, selectedCurrentSemester - 1)
        : isRepeatSemesterMode
          ? selectedCurrentSemester
        : selectedCurrentSemester;
  const previousSemesterUnavailable = isPreviousSemesterMode && selectedCurrentSemester != null && selectedCurrentSemester <= 1;
  const requiresCleanupConfirmation = isCleanupSemesterMode && Boolean(selectedOc) && !previousSemesterUnavailable;
  const targetCourseUnavailable =
    Boolean(selectedOc) &&
    (nextCoursesQuery.isLoading ||
      nextCoursesQuery.isError ||
      transferOptions.length === 0 ||
      !selectedTargetCourse);

  useEffect(() => {
    setOcNameSearch(selectedOc?.ocName ?? "");
  }, [selectedOc?.ocName]);

  useEffect(() => {
    if (!resolvedPrefill) return;
    setTransferMode(initialTransferMode);
    reset({
      ocId: resolvedPrefill.ocId,
      ocName: resolvedPrefill.ocName,
      courseNo: resolvedPrefill.currentCourseCode,
      currentCourseId: resolvedPrefill.currentCourseId,
      transferTo: resolvedPrefill.transferToCourseId ?? "",
      reason: prefillReason ?? "",
      remark: "",
      pdfFile: null,
    });
    setValue("ocId", resolvedPrefill.ocId, { shouldDirty: false, shouldValidate: true });
    setOcNameSearch(resolvedPrefill.ocName);
  }, [initialTransferMode, prefillReason, reset, resolvedPrefill, setValue]);

  useEffect(() => {
    setCleanupConfirmed(false);
  }, [selectedOcId, selectedTransferToCourseId, transferMode]);

  useEffect(() => {
    if (!isCleanupSemesterMode || lockTransferTo || selectedTransferToCourseId || transferOptions.length !== 1) {
      return;
    }
    setValue("transferTo", transferOptions[0].courseId, { shouldDirty: true, shouldValidate: true });
  }, [isCleanupSemesterMode, lockTransferTo, selectedTransferToCourseId, setValue, transferOptions]);

  useEffect(() => {
    if (!targetCourseErrorMessage || !selectedOc) {
      lastTargetCourseErrorRef.current = null;
      return;
    }

    const key = `${currentCourseId}:${targetCourseMode}:${targetCourseErrorMessage}`;
    if (lastTargetCourseErrorRef.current === key) return;

    toast.error(targetCourseErrorMessage);
    lastTargetCourseErrorRef.current = key;
  }, [currentCourseId, selectedOc, targetCourseErrorMessage, targetCourseMode]);

  useEffect(() => {
    if (lockTransferTo || !selectedTransferToCourseId || nextCoursesQuery.isLoading) return;
    const selectedStillAvailable = transferOptions.some(
      (course) => course.courseId === selectedTransferToCourseId
    );
    if (!selectedStillAvailable) {
      setValue("transferTo", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [
    lockTransferTo,
    nextCoursesQuery.isLoading,
    selectedTransferToCourseId,
    setValue,
    transferOptions,
  ]);

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
    let pdfObjectKey: string | null = null;
    try {
      if (isCleanupSemesterMode && (!targetSemester || previousSemesterUnavailable || !cleanupConfirmed)) {
        throw new Error("Confirm the semester cleanup before submitting.");
      }

      if (targetCourseUnavailable) {
        throw new Error(targetCourseErrorMessage ?? "Select a valid target course before submitting.");
      }

      let pdfUrl: string | null = null;

      const file = formData.pdfFile?.[0];
      if (file) {
        const presign = await presignMutation.mutateAsync({
          fileName: file.name,
          contentType: "application/pdf",
          sizeBytes: file.size,
        });
        pdfObjectKey = presign.objectKey;

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

        pdfUrl = presign.publicUrl;
      }

      const payload = {
        ocId: formData.ocId,
        toCourseId: formData.transferTo,
        relegationMode: targetCourseMode,
        targetSemester: isCleanupSemesterMode ? targetSemester : null,
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
      if (lockOcSelection || resolvedPrefill) {
        setValue("courseNo", transfer.toCourse.courseCode, { shouldDirty: false });
        setValue("currentCourseId", transfer.toCourse.courseId, { shouldDirty: false });
        setValue("reason", "", { shouldDirty: false });
        setValue("remark", "", { shouldDirty: false });
        resetField("pdfFile");
        setCleanupConfirmed(false);
      } else {
        reset({
          ocId: "",
          ocName: "",
          courseNo: "",
          currentCourseId: "",
          transferTo: "",
          reason: "",
          remark: "",
          pdfFile: null,
        });
        setOcNameSearch("");
        setCleanupConfirmed(false);
      }

      const successMessage =
        mode === "promotion-exception"
          ? `OC ${transfer.oc.ocNo} marked as promotion exception.`
          : transfer.history.movementKind === "SEMESTER_REPEAT"
            ? `OC ${transfer.oc.ocNo} moved to ${transfer.toCourse.courseCode} semester ${transfer.history.toSemester ?? targetSemester}.`
          : transfer.history.movementKind === "SEMESTER_RELEGATION"
            ? `OC ${transfer.oc.ocNo} moved to ${transfer.toCourse.courseCode} semester ${transfer.history.toSemester ?? targetSemester}.`
          : `OC ${transfer.oc.ocNo} transferred from ${transfer.fromCourse.courseCode} to ${transfer.toCourse.courseCode}.`;
      toast.success(successMessage);
      onSuccess?.(transfer);
    } catch (error) {
      if (pdfObjectKey) {
        await cleanupPendingPdfMutation.mutateAsync({ objectKey: pdfObjectKey }).catch(() => undefined);
      }
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
          rules={{
            validate: (value) => {
              if (lockOcSelection && resolvedPrefill?.ocId) return true;
              return value ? true : "OC selection is required";
            },
          }}
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

      <div className="grid gap-4 md:grid-cols-2">
        {mode === "transfer" && !lockTransferMode ? (
          <div className="space-y-2 md:col-span-2">
            <Label>Relegation Type</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant={transferMode === "PREVIOUS_SEMESTER" ? "destructive" : "outline"}
                onClick={() => setTransferMode("PREVIOUS_SEMESTER")}
                disabled={isBusy}
              >
                Previous semester relegation
              </Button>
              <Button
                type="button"
                variant={transferMode === "COURSE_TRANSFER" ? "default" : "outline"}
                onClick={() => setTransferMode("COURSE_TRANSFER")}
                disabled={isBusy}
              >
                Course transfer
              </Button>
            </div>
          </div>
        ) : mode === "transfer" && lockTransferMode ? (
          <div className="space-y-2 md:col-span-2">
            <Label>Relegation Type</Label>
            <Input
              value={
                transferMode === "REPEAT_SEMESTER"
                  ? "Repeat semester relegation"
                  : transferMode === "PREVIOUS_SEMESTER"
                    ? "Previous semester relegation"
                    : "Course transfer"
              }
              disabled
              readOnly
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="courseNo">Current Course</Label>
          <Input id="courseNo" {...register("courseNo")} disabled />
        </div>

        <div className="space-y-2">
          <Label htmlFor="currentSemester">Current Semester</Label>
          <Input
            id="currentSemester"
            value={selectedCurrentSemester ? `Semester ${selectedCurrentSemester}` : ""}
            placeholder="Select an OC"
            disabled
            readOnly
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="transferTo">Targeted Course</Label>
          <Controller
            name="transferTo"
            control={control}
            rules={{ required: "Transfer target is required" }}
            render={({ field }) => (
              <Select
                value={field.value || undefined}
                onValueChange={field.onChange}
                disabled={
                  !selectedOc ||
                  nextCoursesQuery.isLoading ||
                  nextCoursesQuery.isError ||
                  isBusy ||
                  lockTransferTo ||
                  !currentCourseId
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
          {selectedOc && !nextCoursesQuery.isLoading && !nextCoursesQuery.isError && transferOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isCleanupSemesterMode
                ? "No next course batch is available for this OC's relegation."
                : "No other course is available for transfer."}
            </p>
          ) : null}
          {targetCourseErrorMessage ? (
            <p className="text-sm text-destructive">
              {targetCourseErrorMessage}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetSemester">Targeted Semester</Label>
          <Input
            id="targetSemester"
            value={targetSemester ? `Semester ${targetSemester}` : ""}
            placeholder={selectedTargetCourse ? "Target semester resolved" : "Select target course"}
            disabled
            readOnly
          />
        </div>
      </div>

      {isCleanupSemesterMode && selectedOc ? (
        <Alert variant={previousSemesterUnavailable ? "destructive" : "default"} className="border-destructive/50">
          <AlertTitle>
            {isRepeatSemesterMode ? "Repeat-Semester Relegation" : "Previous-Semester Relegation"}
          </AlertTitle>
          <AlertDescription className="space-y-3">
            {previousSemesterUnavailable ? (
              <p>OC {selectedOc.ocNo} is already in semester 1, so previous-semester relegation is not available.</p>
            ) : (
              <>
                <p>
                  OC {selectedOc.ocNo} will move from {selectedOc.currentCourseCode} semester {selectedCurrentSemester} to{" "}
                  {selectedTargetCourse?.courseCode ?? "the selected target course"} semester {targetSemester}.
                </p>
                <p>
                  {isRepeatSemesterMode
                    ? `Data after semester ${selectedCurrentSemester} will be deleted for the current attempt. Semester ${selectedCurrentSemester} data will remain in history.`
                    : `Data from ${selectedOc.currentCourseCode} semester ${selectedCurrentSemester} and later will be deleted for the current attempt. Semester ${targetSemester} data from the first attempt will remain in history.`}
                </p>
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={cleanupConfirmed}
                    onCheckedChange={(checked) => setCleanupConfirmed(checked === true)}
                    disabled={isBusy}
                  />
                  <span>I understand the future-semester data cleanup for this OC.</span>
                </label>
              </>
            )}
          </AlertDescription>
        </Alert>
      ) : null}

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
          disabled={isBusy || targetCourseUnavailable}
        />
      </div>

      <Button
        type="submit"
        disabled={
          isBusy ||
          targetCourseUnavailable ||
          previousSemesterUnavailable ||
          (requiresCleanupConfirmation && !cleanupConfirmed)
        }
        className="w-full cursor-pointer"
      >
        {isBusy
          ? mode === "promotion-exception"
            ? "Saving Exception..."
            : "Submitting..."
          : submitLabel ?? (mode === "promotion-exception" ? "Save Exception" : "Submit")}
      </Button>
    </form>
  );
}
