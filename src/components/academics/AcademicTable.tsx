"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { useAcademics } from "@/hooks/useAcademics";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { extractRequestId, extractValidationIssues, resolveApiMessage } from "@/lib/api-feedback";

export type AcademicRow = {
  subjectId: string;
  subject: string;
  exam?: string;
  credit?: string | number;
  practicalExam?: string | null;
  practicalCredit?: string | number | null;
};

type RowState = {
  phase1: string;
  phase2: string;
  tutorial: string;
  sessional: string;
  final: string;
  practical: string;
  total: string;
  grade: string;
  practicalPhase1: string;
  practicalPhase2: string;
  practicalTutorial: string;
  practicalSessional: string;
  practicalFinal: string;
  practicalPractical: string;
  practicalTotal: string;
  practicalRemarks: string;
  practicalExam?: string | null;
  practicalCredit?: string | number | null;
  practicalGrade: string;
};

type DeleteTarget =
  | { type: "semester"; semester: number }
  | { type: "subject"; subjectId: string; subjectName: string };

interface AcademicTableProps {
  ocId: string;
  semester: number;
  rows: AcademicRow[];
  totalCredits?: string | number;
  title?: string;
  canEdit?: boolean;
}

function createInitialRowState(row: AcademicRow): RowState {
  return {
    phase1: "",
    phase2: "",
    tutorial: "",
    sessional: "",
    final: "",
    practical: "",
    total: "",
    grade: "",
    practicalPhase1: "",
    practicalPhase2: "",
    practicalTutorial: "",
    practicalSessional: "",
    practicalFinal: "",
    practicalPractical: "",
    practicalTotal: "",
    practicalRemarks: "",
    practicalExam: row.practicalExam || "Practical",
    practicalCredit: row.practicalCredit || "",
    practicalGrade: "",
  };
}

export default function AcademicTable({
  ocId,
  semester,
  rows,
  totalCredits = "",
  title = "",
  canEdit = false,
}: AcademicTableProps) {
  const {
    loading,
    error,
    queryError,
    semesterData,
    getSpecificSemester,
    updateSemesterGPA,
    updateSubjectMarks,
    deleteSemester,
    deleteSubject,
    refetchSemester,
    isSaving,
    isDeleting,
    resetMutationState,
  } = useAcademics(ocId, semester);

  const initialState = useMemo<RowState[]>(() => rows.map(createInitialRowState), [rows]);

  const [data, setData] = useState<RowState[]>(initialState);
  const [isEditing, setIsEditing] = useState(false);
  const [sgpa, setSgpa] = useState("");
  const [marksScored, setMarksScored] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [marksFieldErrors, setMarksFieldErrors] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [hardDelete, setHardDelete] = useState(false);

  const hasSubjectsConfigured = rows.length > 0;
  const hasSavedSemesterData = (semesterData?.subjects?.length ?? 0) > 0;

  const toNum = (v: string | number | undefined): number => {
    const n = parseFloat(String(v || "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const calculateValues = (rowData: RowState): RowState => {
    const sessional = toNum(rowData.phase1) + toNum(rowData.phase2) + toNum(rowData.tutorial);
    const total = sessional + toNum(rowData.final);
    const practicalTotal = toNum(rowData.practicalFinal) + toNum(rowData.practicalTutorial);

    return {
      ...rowData,
      sessional: sessional > 0 ? String(Math.round(sessional)) : "",
      total: total > 0 ? String(Math.round(total)) : "",
      practicalTotal: practicalTotal > 0 ? String(Math.round(practicalTotal)) : "",
    };
  };

  const clearValidationFeedback = () => {
    setFormErrors([]);
    setMarksFieldErrors([]);
  };

  const handleMutationError = (errorInput: unknown, fallback: string) => {
    const message = resolveApiMessage(errorInput, fallback);
    const requestId = extractRequestId(errorInput);
    const issues = extractValidationIssues(errorInput);

    const summary: string[] = [...issues.formErrors];
    for (const [field, fieldMessages] of Object.entries(issues.fieldErrors)) {
      if (field === "marksScored") continue;
      fieldMessages.forEach((msg) => summary.push(`${field}: ${msg}`));
    }

    setFormErrors(summary);
    setMarksFieldErrors(issues.fieldErrors.marksScored ?? []);

    if (message === fallback && requestId) {
      toast.error(`${message} Request ID: ${requestId}`);
      return;
    }

    toast.error(message);
  };

  useEffect(() => {
    if (!semesterData) {
      setData(initialState);
      setIsEditing(false);
      setIsInitialLoad(false);
      return;
    }

    setSgpa(semesterData.sgpa?.toString() || "");
    setCgpa(semesterData.cgpa?.toString() || "");
    setMarksScored(semesterData.marksScored?.toString() || "");

    const updatedData = rows.map((row, idx) => {
      const subject = semesterData.subjects?.find((s) => s.subject?.id === row.subjectId);
      const theory = subject?.theory;
      const practical = subject?.practical;

      const baseData = {
        ...initialState[idx],
        phase1: theory?.phaseTest1Marks?.toString() || "",
        phase2: theory?.phaseTest2Marks?.toString() || "",
        tutorial: theory?.tutorial?.toString() || "",
        final: theory?.finalMarks?.toString() || "",
        grade: theory?.grade?.toString() || "",
        practicalFinal: practical?.finalMarks?.toString() || "",
        practicalTutorial: practical?.tutorial?.toString() || "",
        practicalGrade: practical?.grade?.toString() || "",
        practicalExam: row.practicalExam || "Practical",
        practicalCredit: row.practicalCredit || "",
      };

      return calculateValues(baseData);
    });

    setData(updatedData);
    setIsEditing(false);
    setIsInitialLoad(false);
  }, [semesterData, rows, initialState]);

  useEffect(() => {
    resetMutationState();
    clearValidationFeedback();
    setDeleteTarget(null);
    setHardDelete(false);
  }, [semester, resetMutationState]);

  const handleChange = (idx: number, key: keyof RowState, value: string) => {
    setData((prev) => {
      const next = [...prev];
      const updatedRow = { ...next[idx], [key]: value };
      next[idx] = calculateValues(updatedRow);
      return next;
    });
  };

  const grandTotal = useMemo(() => {
    return data.reduce((sum, row) => sum + toNum(row.total) + toNum(row.practicalTotal), 0);
  }, [data]);

  const handleSave = async () => {
    if (!canEdit) return;

    clearValidationFeedback();

    try {
      let successMessage: string | null = null;

      const trimmedMarks = (marksScored ?? "").trim();
      if (trimmedMarks !== "") {
        const parsedMarks = parseFloat(trimmedMarks);
        if (Number.isNaN(parsedMarks)) {
          setMarksFieldErrors(["Marks scored must be a valid number."]);
          toast.error("Marks scored must be a valid number.");
          return;
        }

        const semesterResponse = await updateSemesterGPA(semester, {
          marksScored: parsedMarks,
        });
        successMessage = semesterResponse.message;
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const state = data[i];

        const trimmedPhase1 = (state.phase1 ?? "").trim();
        const trimmedPhase2 = (state.phase2 ?? "").trim();
        const trimmedTutorial = (state.tutorial ?? "").trim();
        const trimmedFinal = (state.final ?? "").trim();
        const trimmedGrade = (state.grade ?? "").trim();
        const trimmedPracticalFinal = (state.practicalFinal ?? "").trim();
        const trimmedPracticalGrade = (state.practicalGrade ?? "").trim();
        const trimmedPracticalTutorial = (state.practicalTutorial ?? "").trim();

        const isTheoryEmpty =
          trimmedPhase1 === "" &&
          trimmedPhase2 === "" &&
          trimmedTutorial === "" &&
          trimmedFinal === "" &&
          trimmedGrade === "";

        const isPracticalEmpty =
          trimmedPracticalFinal === "" &&
          trimmedPracticalGrade === "" &&
          trimmedPracticalTutorial === "";

        if (isTheoryEmpty && isPracticalEmpty) {
          continue;
        }

        const subjectResponse = await updateSubjectMarks(semester, row.subjectId, {
          theory: {
            phaseTest1Marks: toNum(trimmedPhase1) || undefined,
            phaseTest2Marks: toNum(trimmedPhase2) || undefined,
            tutorial: trimmedTutorial || undefined,
            finalMarks: toNum(trimmedFinal) || undefined,
            grade: trimmedGrade || undefined,
          },
          practical: {
            finalMarks: toNum(trimmedPracticalFinal) || undefined,
            grade: trimmedPracticalGrade || undefined,
            tutorial: trimmedPracticalTutorial || undefined,
          },
        });
        successMessage = subjectResponse.message;
      }

      await refetchSemester();
      setIsEditing(false);
      toast.success(successMessage || "Academic summary updated successfully.");
    } catch (errorInput) {
      handleMutationError(errorInput, "Something went wrong. Please try again.");
    }
  };

  const handleReset = () => {
    clearValidationFeedback();
    if (!semesterData) {
      setData(initialState);
      setMarksScored("");
      return;
    }

    setData(
      rows.map((row, idx) => {
        const subject = semesterData.subjects?.find((s) => s.subject?.id === row.subjectId);
        const theory = subject?.theory;
        const practical = subject?.practical;

        return calculateValues({
          ...initialState[idx],
          phase1: theory?.phaseTest1Marks?.toString() || "",
          phase2: theory?.phaseTest2Marks?.toString() || "",
          tutorial: theory?.tutorial?.toString() || "",
          final: theory?.finalMarks?.toString() || "",
          grade: theory?.grade?.toString() || "",
          practicalFinal: practical?.finalMarks?.toString() || "",
          practicalTutorial: practical?.tutorial?.toString() || "",
          practicalGrade: practical?.grade?.toString() || "",
          practicalExam: row.practicalExam || "Practical",
          practicalCredit: row.practicalCredit || "",
        });
      })
    );
    setMarksScored(semesterData.marksScored?.toString() || "");
    setIsEditing(false);
  };

  const requestDelete = (target: DeleteTarget) => {
    clearValidationFeedback();
    setHardDelete(false);
    setDeleteTarget(target);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !canEdit) return;

    try {
      if (deleteTarget.type === "semester") {
        const response = await deleteSemester(deleteTarget.semester, { hard: hardDelete });
        toast.success(response.message);
      } else {
        const response = await deleteSubject(semester, deleteTarget.subjectId, { hard: hardDelete });
        toast.success(response.message);
      }

      setDeleteTarget(null);
      setHardDelete(false);
      setIsEditing(false);
      await refetchSemester();
    } catch (errorInput) {
      handleMutationError(errorInput, "Something went wrong. Please try again.");
    }
  };

  if (loading && isInitialLoad) {
    return <div className="p-4 text-center text-muted-foreground">Loading academics...</div>;
  }

  if (error && !semesterData) {
    const requestId = extractRequestId(queryError);
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        <p>{error}</p>
        {requestId ? <p className="mt-1 text-xs">Request ID: {requestId}</p> : null}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {title ? <h4 className="font-medium">{title}</h4> : <div />}
        {canEdit ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isDeleting || isSaving}
            onClick={() => requestDelete({ type: "semester", semester })}
          >
            <Trash2 className="h-4 w-4" />
            Delete Semester
          </Button>
        ) : null}
      </div>

      {!canEdit ? (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Read-only access: only Platoon Commander, ADMIN, and SUPER_ADMIN can edit, add, or delete academics records.
        </div>
      ) : null}

      {hasSubjectsConfigured && !hasSavedSemesterData ? (
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Subjects are configured for this semester, but no marks have been saved yet.
        </div>
      ) : null}

      {formErrors.length > 0 ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <p className="font-medium">Validation failed</p>
          <ul className="mt-1 list-disc pl-5">
            {formErrors.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <table className="w-full table-auto border-collapse">
        <thead>
          <tr>
            <th className="border px-2 py-2 bg-muted/40">S No.</th>
            <th className="border px-2 py-2 bg-muted/40">Sub</th>
            <th className="border px-2 py-2 bg-muted/40">Exam</th>
            <th className="border px-2 py-2 bg-muted/40">Credit</th>
            <th className="border px-2 py-2 bg-muted/40">Phase I</th>
            <th className="border px-2 py-2 bg-muted/40">Phase II</th>
            <th className="border px-2 py-2 bg-muted/40">Tutorial</th>
            <th className="border px-2 py-2 bg-muted/40">Sessional</th>
            <th className="border px-2 py-2 bg-muted/40">Final</th>
            <th className="border px-2 py-2 bg-muted/40">Practical</th>
            <th className="border px-2 py-2 bg-muted/40">Total</th>
            <th className="border px-2 py-2 bg-muted/40">Grade</th>
            {canEdit ? <th className="border px-2 py-2 bg-muted/40">Actions</th> : null}
          </tr>
        </thead>

        <tbody>
          {rows.map((r, idx) => {
            const state = data[idx];
            if (!state) return null;

            return (
              <React.Fragment key={r.subjectId}>
                <tr>
                  <td className="border px-2 py-1" rowSpan={2}>
                    {idx + 1}
                  </td>
                  <td className="border px-2 py-1" rowSpan={2}>
                    {r.subject}
                  </td>
                  <td className="border px-2 py-1">{r.exam || "Theory"}</td>
                  <td className="border px-2 py-1">{r.credit || ""}</td>

                  {(["phase1", "phase2", "tutorial"] as const).map((key) => (
                    <td key={key} className="border px-2 py-1">
                      <input
                        value={state[key]}
                        disabled={!canEdit || !isEditing || isSaving}
                        onChange={(e) => handleChange(idx, key, e.target.value)}
                        className="w-full border px-1 rounded bg-background"
                      />
                    </td>
                  ))}

                  <td className="border px-2 py-1">
                    <input value={state.sessional} disabled className="w-full border px-1 bg-muted/70" />
                  </td>

                  <td className="border px-2 py-1">
                    <input
                      value={state.final}
                      disabled={!canEdit || !isEditing || isSaving}
                      onChange={(e) => handleChange(idx, "final", e.target.value)}
                      className="w-full border px-1 rounded bg-background"
                    />
                  </td>

                  <td className="border px-2 py-1">
                    <input value={state.practical} disabled className="w-full border px-1 rounded bg-muted/70" />
                  </td>

                  <td className="border px-2 py-1">
                    <input value={state.total} disabled className="w-full border px-1 bg-muted/70" />
                  </td>

                  <td className="border px-2 py-1">
                    <input
                      value={state.grade}
                      disabled={!canEdit || !isEditing || isSaving}
                      onChange={(e) => handleChange(idx, "grade", e.target.value)}
                      className="w-full border px-1 rounded bg-background"
                    />
                  </td>

                  {canEdit ? (
                    <td className="border px-2 py-1 align-top" rowSpan={2}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={isDeleting || isSaving}
                        onClick={() =>
                          requestDelete({
                            type: "subject",
                            subjectId: r.subjectId,
                            subjectName: r.subject,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </td>
                  ) : null}
                </tr>

                <tr className="bg-muted/40">
                  <td className="border px-2 py-1">{r.practicalExam || "Practical"}</td>

                  <td className="border px-2 py-1">{r.practicalCredit || ""}</td>

                  <td className="border px-2 py-1">
                    <input value={state.practicalPhase1} disabled className="w-full border px-1 rounded bg-muted/70" />
                  </td>
                  <td className="border px-2 py-1">
                    <input value={state.practicalPhase2} disabled className="w-full border px-1 rounded bg-muted/70" />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      value={state.practicalTutorial}
                      disabled={!canEdit || !isEditing || isSaving}
                      onChange={(e) => handleChange(idx, "practicalTutorial", e.target.value)}
                      className="w-full border px-1 rounded bg-background"
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      value={state.practicalSessional}
                      disabled
                      className="w-full border px-1 rounded bg-muted/70"
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      value={state.practicalFinal}
                      disabled={!canEdit || !isEditing || isSaving}
                      onChange={(e) => handleChange(idx, "practicalFinal", e.target.value)}
                      className="w-full border px-1 rounded bg-background"
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      value={state.practicalPractical}
                      disabled
                      className="w-full border px-1 rounded bg-muted/70"
                    />
                  </td>

                  <td className="border px-2 py-1">
                    <input value={state.practicalTotal} disabled className="w-full border px-1 bg-muted/70" />
                  </td>

                  <td className="border px-2 py-1">
                    <input
                      value={state.practicalGrade}
                      disabled={!canEdit || !isEditing || isSaving}
                      onChange={(e) => handleChange(idx, "practicalGrade", e.target.value)}
                      className="w-full border px-1 rounded bg-background"
                    />
                  </td>
                </tr>
              </React.Fragment>
            );
          })}

          <tr>
            <td className="border px-2 py-1" colSpan={3}>
              Total
            </td>
            <td className="border px-2 py-1">{totalCredits}</td>
            <td className="border px-2 py-1" colSpan={6}></td>
            <td className="border px-2 py-1 font-bold">{Math.round(grandTotal)}</td>
            <td className="border px-2 py-1"></td>
            {canEdit ? <td className="border px-2 py-1"></td> : null}
          </tr>

          <tr>
            <td className="border px-2 py-1">SGPA</td>
            <td className="border px-2 py-1" colSpan={canEdit ? 12 : 11}>
              {sgpa || "-"}
            </td>
          </tr>
          <tr>
            <td className="border px-2 py-1">Marks(1350)</td>
            <td className="border px-2 py-1" colSpan={canEdit ? 12 : 11}>
              <input
                value={marksScored}
                disabled={!canEdit || !isEditing || isSaving}
                onChange={(e) => setMarksScored(e.target.value)}
                className="w-full border px-1 rounded bg-background"
                placeholder="Enter marks scored"
              />
              {marksFieldErrors.length > 0 ? (
                <p className="mt-1 text-xs text-destructive">{marksFieldErrors.join(" ")}</p>
              ) : null}
            </td>
          </tr>
          <tr>
            <td className="border px-2 py-1">CGPA</td>
            <td className="border px-2 py-1" colSpan={canEdit ? 12 : 11}>
              {cgpa || "-"}
            </td>
          </tr>
        </tbody>
      </table>

      {canEdit ? (
        <div className="flex gap-3 mt-4 justify-center items-center">
          {!isEditing ? (
            <Button type="button" onClick={() => setIsEditing(true)} disabled={isSaving || isDeleting}>
              Edit
            </Button>
          ) : (
            <>
              <Button type="button" onClick={handleSave} disabled={isSaving || isDeleting}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button type="button" variant="outline" onClick={handleReset} disabled={isSaving || isDeleting}>
                Reset
              </Button>
            </>
          )}
        </div>
      ) : null}

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteTarget(null);
            setHardDelete(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete academic record?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "subject"
                ? `Delete subject ${deleteTarget.subjectName} for semester ${semester}.`
                : `Delete all records for semester ${semester}.`} This action defaults to soft delete.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox
              checked={hardDelete}
              onCheckedChange={(checked) => setHardDelete(Boolean(checked))}
              disabled={isDeleting}
            />
            Hard delete permanently
          </label>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
