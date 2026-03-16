"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useAcademics } from "@/hooks/useAcademics";
import { Button } from "@/components/ui/button";
import { extractRequestId, extractValidationIssues, resolveApiMessage } from "@/lib/api-feedback";

export type AcademicRow = {
  subjectId: string;
  subject: string;
  exam?: string;
  credit?: string | number | null;
  practicalExam?: string | null;
  practicalCredit?: string | number | null;
  includeTheory?: boolean;
  includePractical?: boolean;
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
    practicalExam: row.practicalExam ?? null,
    practicalCredit: row.practicalCredit ?? "",
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
    updateSemesterGPA,
    updateSubjectMarks,
    refetchSemester,
    isSaving,
    resetMutationState,
  } = useAcademics(ocId, semester);

  const initialState = useMemo<RowState[]>(() => rows.map(createInitialRowState), [rows]);

  const [data, setData] = useState<RowState[]>(initialState);
  const [isEditing, setIsEditing] = useState(false);
  const [sgpa, setSgpa] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const resetMutationStateRef = useRef(resetMutationState);
  const rowStateKeys = useMemo(
    () => [
      "phase1",
      "phase2",
      "tutorial",
      "sessional",
      "final",
      "practical",
      "total",
      "grade",
      "practicalPhase1",
      "practicalPhase2",
      "practicalTutorial",
      "practicalSessional",
      "practicalFinal",
      "practicalPractical",
      "practicalTotal",
      "practicalRemarks",
      "practicalExam",
      "practicalCredit",
      "practicalGrade",
    ] as const,
    []
  );

  const areRowStatesEqual = (a: RowState, b: RowState) =>
    rowStateKeys.every((key) => a[key] === b[key]);

  const areRowStateArraysEqual = (a: RowState[], b: RowState[]) =>
    a.length === b.length && a.every((row, idx) => areRowStatesEqual(row, b[idx]));

  const hasSubjectsConfigured = rows.length > 0;
  const hasSavedSemesterData = (semesterData?.subjects?.length ?? 0) > 0;

  const toNum = (v: string | number | undefined): number => {
    const n = parseFloat(String(v ?? "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const calculateValues = (rowData: RowState): RowState => {
    const sessional = toNum(rowData.phase1) + toNum(rowData.phase2) + toNum(rowData.tutorial);
    const total = sessional + toNum(rowData.final);
    const practicalTotal = toNum(rowData.practicalFinal) + toNum(rowData.practicalTutorial);
    const practicalMarks = toNum(rowData.practicalFinal);

    return {
      ...rowData,
      sessional: sessional > 0 ? String(Math.round(sessional)) : "",
      total: total > 0 ? String(Math.round(total)) : "",
      practicalPractical: practicalMarks > 0 ? String(Math.round(practicalMarks)) : "",
      practicalTotal: practicalTotal > 0 ? String(Math.round(practicalTotal)) : "",
    };
  };

  const clearValidationFeedback = () => {
    setFormErrors((prev) => (prev.length > 0 ? [] : prev));
  };

  const handleMutationError = (errorInput: unknown, fallback: string) => {
    const message = resolveApiMessage(errorInput, fallback);
    const requestId = extractRequestId(errorInput);
    const issues = extractValidationIssues(errorInput);

    const summary: string[] = [...issues.formErrors];
    for (const [field, fieldMessages] of Object.entries(issues.fieldErrors)) {
      fieldMessages.forEach((msg) => summary.push(`${field}: ${msg}`));
    }

    setFormErrors(summary);

    if (message === fallback && requestId) {
      toast.error(`${message} Request ID: ${requestId}`);
      return;
    }

    toast.error(message);
  };

  useEffect(() => {
    if (!semesterData) {
      setData((prev) => (areRowStateArraysEqual(prev, initialState) ? prev : initialState));
      setIsEditing((prev) => (prev ? false : prev));
      setIsInitialLoad((prev) => (prev ? false : prev));
      return;
    }

    const nextSgpa = semesterData.sgpa?.toString() || "";
    const nextCgpa = semesterData.cgpa?.toString() || "";
    setSgpa((prev) => (prev === nextSgpa ? prev : nextSgpa));
    setCgpa((prev) => (prev === nextCgpa ? prev : nextCgpa));

    const updatedData = rows.map((row, idx) => {
      const subject = semesterData.subjects?.find((s) => s.subject?.id === row.subjectId);
      const theory = subject?.theory;
      const practical = subject?.practical;
      const hasTheoryComponent = row.includeTheory !== false;
      const hasPracticalComponent = row.includePractical === true;
      const hasTheoryCredits = toNum(row.credit ?? undefined) > 0;
      const hasPracticalCredits = toNum(row.practicalCredit ?? undefined) > 0;

      const baseData = {
        ...initialState[idx],
        phase1: hasTheoryComponent ? theory?.phaseTest1Marks?.toString() || "" : "",
        phase2: hasTheoryComponent ? theory?.phaseTest2Marks?.toString() || "" : "",
        tutorial: hasTheoryComponent ? theory?.tutorial?.toString() || "" : "",
        final: hasTheoryComponent ? theory?.finalMarks?.toString() || "" : "",
        grade: hasTheoryComponent && hasTheoryCredits ? theory?.grade?.toString() || "" : "",
        practicalFinal: hasPracticalComponent ? practical?.finalMarks?.toString() || "" : "",
        practicalPractical: hasPracticalComponent ? practical?.finalMarks?.toString() || "" : "",
        practicalTutorial: hasPracticalComponent ? practical?.tutorial?.toString() || "" : "",
        practicalGrade:
          hasPracticalComponent && hasPracticalCredits ? practical?.grade?.toString() || "" : "",
        practicalExam: row.practicalExam ?? null,
        practicalCredit: row.practicalCredit ?? "",
      };

      return calculateValues(baseData);
    });

    setData((prev) => (areRowStateArraysEqual(prev, updatedData) ? prev : updatedData));
    setIsEditing((prev) => (prev ? false : prev));
    setIsInitialLoad((prev) => (prev ? false : prev));
  }, [semesterData, rows, initialState]);

  useEffect(() => {
    resetMutationStateRef.current = resetMutationState;
  }, [resetMutationState]);

  useEffect(() => {
    resetMutationStateRef.current();
    clearValidationFeedback();
  }, [semester]);

  const handleChange = (idx: number, key: keyof RowState, value: string) => {
    setData((prev) => {
      const next = [...prev];
      const updatedRow = { ...next[idx], [key]: value };
      next[idx] = calculateValues(updatedRow);
      return next;
    });
  };

  const grandTotal = useMemo(() => {
    return data.reduce((sum, row, idx) => {
      const includesPractical = rows[idx]?.includePractical === true;
      return sum + toNum(row.total) + (includesPractical ? toNum(row.practicalTotal) : 0);
    }, 0);
  }, [data, rows]);

  const autoMarksScored = useMemo(() => Math.round(grandTotal), [grandTotal]);

  const handleSave = async () => {
    if (!canEdit) return;

    clearValidationFeedback();

    try {
      let successMessage: string | null = null;

      const semesterResponse = await updateSemesterGPA(semester, {
        marksScored: autoMarksScored,
      });
      successMessage = semesterResponse.message;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const state = data[i];
        const hasTheoryComponent = row.includeTheory !== false;
        const hasPracticalComponent = row.includePractical === true;
        const shouldAllowTheoryGrade = toNum(row.credit ?? undefined) > 0;
        const shouldAllowPracticalGrade = toNum(row.practicalCredit ?? undefined) > 0;

        const trimmedPhase1 = (state.phase1 ?? "").trim();
        const trimmedPhase2 = (state.phase2 ?? "").trim();
        const trimmedTutorial = (state.tutorial ?? "").trim();
        const trimmedFinal = (state.final ?? "").trim();
        const trimmedGrade = shouldAllowTheoryGrade ? (state.grade ?? "").trim() : "";
        const trimmedPracticalFinal = (state.practicalFinal ?? "").trim();
        const trimmedPracticalGrade = shouldAllowPracticalGrade ? (state.practicalGrade ?? "").trim() : "";
        const trimmedPracticalTutorial = (state.practicalTutorial ?? "").trim();

        const isTheoryEmpty =
          !hasTheoryComponent ||
          (trimmedPhase1 === "" &&
            trimmedPhase2 === "" &&
            trimmedTutorial === "" &&
            trimmedFinal === "" &&
            trimmedGrade === "");

        const isPracticalEmpty =
          !hasPracticalComponent ||
          (trimmedPracticalFinal === "" &&
            trimmedPracticalGrade === "" &&
            trimmedPracticalTutorial === "");

        if (isTheoryEmpty && isPracticalEmpty) {
          continue;
        }

        const theoryPayload = hasTheoryComponent
          ? {
              phaseTest1Marks: toNum(trimmedPhase1) || undefined,
              phaseTest2Marks: toNum(trimmedPhase2) || undefined,
              tutorial: trimmedTutorial || undefined,
              finalMarks: toNum(trimmedFinal) || undefined,
              grade: trimmedGrade || undefined,
            }
          : undefined;
        const practicalPayload = hasPracticalComponent
          ? {
              finalMarks: toNum(trimmedPracticalFinal) || undefined,
              grade: trimmedPracticalGrade || undefined,
              tutorial: trimmedPracticalTutorial || undefined,
            }
          : undefined;

        const subjectResponse = await updateSubjectMarks(semester, row.subjectId, {
          theory: theoryPayload,
          practical: practicalPayload,
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

  const restoreFormFromSemesterData = () => {
    clearValidationFeedback();
    if (!semesterData) {
      setData(initialState);
      return;
    }

    setData(
      rows.map((row, idx) => {
        const subject = semesterData.subjects?.find((s) => s.subject?.id === row.subjectId);
        const theory = subject?.theory;
        const practical = subject?.practical;
        const hasTheoryComponent = row.includeTheory !== false;
        const hasPracticalComponent = row.includePractical === true;
        const hasTheoryCredits = toNum(row.credit ?? undefined) > 0;
        const hasPracticalCredits = toNum(row.practicalCredit ?? undefined) > 0;

        return calculateValues({
          ...initialState[idx],
          phase1: hasTheoryComponent ? theory?.phaseTest1Marks?.toString() || "" : "",
          phase2: hasTheoryComponent ? theory?.phaseTest2Marks?.toString() || "" : "",
          tutorial: hasTheoryComponent ? theory?.tutorial?.toString() || "" : "",
          final: hasTheoryComponent ? theory?.finalMarks?.toString() || "" : "",
          grade: hasTheoryComponent && hasTheoryCredits ? theory?.grade?.toString() || "" : "",
          practicalFinal: hasPracticalComponent ? practical?.finalMarks?.toString() || "" : "",
          practicalPractical: hasPracticalComponent ? practical?.finalMarks?.toString() || "" : "",
          practicalTutorial: hasPracticalComponent ? practical?.tutorial?.toString() || "" : "",
          practicalGrade:
            hasPracticalComponent && hasPracticalCredits ? practical?.grade?.toString() || "" : "",
          practicalExam: row.practicalExam ?? null,
          practicalCredit: row.practicalCredit ?? "",
        });
      })
    );
  };

  const handleReset = () => {
    restoreFormFromSemesterData();
  };

  const handleCancel = () => {
    restoreFormFromSemesterData();
    setIsEditing(false);
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
      </div>

      {!canEdit ? (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Read-only access: only Platoon Commander, ADMIN, and SUPER_ADMIN can edit or add academics records.
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
          </tr>
        </thead>

        <tbody>
          {rows.map((r, idx) => {
            const state = data[idx];
            if (!state) return null;
            const hasTheoryComponent = r.includeTheory !== false;
            const hasPracticalComponent = r.includePractical === true;
            const hasTheoryCredits = toNum(r.credit ?? undefined) > 0;
            const hasPracticalCredits = toNum(r.practicalCredit ?? undefined) > 0;

            return (
              <React.Fragment key={r.subjectId}>
                <tr>
                  <td className="border px-2 py-1" rowSpan={hasPracticalComponent ? 2 : 1}>
                    {idx + 1}
                  </td>
                  <td className="border px-2 py-1" rowSpan={hasPracticalComponent ? 2 : 1}>
                    {r.subject}
                  </td>
                  <td className="border px-2 py-1">{r.exam || (hasPracticalComponent ? "Practical" : "Theory")}</td>
                  <td className="border px-2 py-1">{r.credit ?? ""}</td>

                  {(["phase1", "phase2", "tutorial"] as const).map((key) => (
                    <td key={key} className="border px-2 py-1">
                      <input
                        value={hasTheoryComponent ? state[key] : ""}
                        disabled={!canEdit || !isEditing || isSaving || !hasTheoryComponent}
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
                      value={hasTheoryComponent ? state.final : ""}
                      disabled={!canEdit || !isEditing || isSaving || !hasTheoryComponent}
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
                      value={hasTheoryCredits ? state.grade : ""}
                      disabled={!canEdit || !isEditing || isSaving || !hasTheoryComponent || !hasTheoryCredits}
                      onChange={(e) => handleChange(idx, "grade", e.target.value)}
                      className="w-full border px-1 rounded bg-background"
                    />
                  </td>
                </tr>

                {hasPracticalComponent ? (
                  <tr className="bg-muted/40">
                    <td className="border px-2 py-1">{r.practicalExam ?? "Practical"}</td>

                    <td className="border px-2 py-1">{r.practicalCredit ?? ""}</td>

                    <td className="border px-2 py-1">
                      <input
                        value={state.practicalPhase1}
                        disabled
                        className="w-full border px-1 rounded bg-muted/70"
                      />
                    </td>
                    <td className="border px-2 py-1">
                      <input
                        value={state.practicalPhase2}
                        disabled
                        className="w-full border px-1 rounded bg-muted/70"
                      />
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
                        value={hasPracticalCredits ? state.practicalGrade : ""}
                        disabled={!canEdit || !isEditing || isSaving || !hasPracticalCredits}
                        onChange={(e) => handleChange(idx, "practicalGrade", e.target.value)}
                        className="w-full border px-1 rounded bg-background"
                      />
                    </td>
                  </tr>
                ) : null}
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
          </tr>

          <tr>
            <td className="border px-2 py-1">SGPA</td>
            <td className="border px-2 py-1" colSpan={11}>
              {sgpa !== "" ? sgpa : "-"}
            </td>
          </tr>
          <tr>
            <td className="border px-2 py-1">Marks(1350)</td>
            <td className="border px-2 py-1" colSpan={11}>
              <input
                value={autoMarksScored}
                disabled
                readOnly
                className="w-full border px-1 rounded bg-muted/70"
              />
            </td>
          </tr>
          <tr>
            <td className="border px-2 py-1">CGPA</td>
            <td className="border px-2 py-1" colSpan={11}>
              {cgpa !== "" ? cgpa : "-"}
            </td>
          </tr>
        </tbody>
      </table>

      {canEdit ? (
        <div className="flex gap-3 mt-4 justify-center items-center">
          {!isEditing ? (
            <Button type="button" onClick={() => setIsEditing(true)} disabled={isSaving}>
              Edit
            </Button>
          ) : (
            <>
              <Button type="button" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
                className="hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
              >
                Cancel
              </Button>
              <Button type="button" variant="outline" onClick={handleReset} disabled={isSaving}>
                Reset
              </Button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
