"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useAcademics } from "@/hooks/useAcademics";
import { Button } from "@/components/ui/button";
import { extractRequestId, extractValidationIssues, resolveApiMessage } from "@/lib/api-feedback";
import type { SubjectWithMarks } from "@/app/lib/api/academics";

export type AcademicRow = {
  subjectId: string;
  subjectCode?: string;
  subject: string;
  exam?: string;
  credit?: string | number | null;
  practicalExam?: string | null;
  practicalCredit?: string | number | null;
  includeTheory?: boolean;
  includePractical?: boolean;
  isLegacyRecord?: boolean;
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

function normalizeSubjectId(value: string | null | undefined) {
  return (value ?? "").trim();
}

function normalizeSubjectCode(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
}

export function rowMatchesSemesterSubject(
  row: Pick<AcademicRow, "subjectId" | "subjectCode">,
  subject: Pick<SubjectWithMarks, "subject">
) {
  const rowSubjectId = normalizeSubjectId(row.subjectId);
  const subjectId = normalizeSubjectId(subject.subject?.id);
  if (rowSubjectId && subjectId && rowSubjectId === subjectId) {
    return true;
  }

  const rowSubjectCode = normalizeSubjectCode(row.subjectCode);
  const subjectCode = normalizeSubjectCode(subject.subject?.code);
  return Boolean(rowSubjectCode && subjectCode && rowSubjectCode === subjectCode);
}

export function buildDisplayAcademicRows(
  rows: AcademicRow[],
  subjects: SubjectWithMarks[] | undefined
): AcademicRow[] {
  if (!subjects?.length) return rows;

  const matched = new Set<number>();
  const nextRows = [...rows];

  for (const subject of subjects) {
    const matchIndex = rows.findIndex((row, index) => {
      if (matched.has(index)) return false;
      return rowMatchesSemesterSubject(row, subject);
    });

    if (matchIndex >= 0) {
      matched.add(matchIndex);
      continue;
    }

    nextRows.push({
      subjectId: subject.subject?.id ?? "",
      subjectCode: subject.subject?.code ?? "",
      subject: subject.subject?.name ?? "Unknown Subject",
      exam: subject.includeTheory ? "Theory" : subject.includePractical ? "Practical" : undefined,
      credit: subject.includeTheory
        ? subject.theoryCredits ?? subject.subject?.defaultTheoryCredits ?? null
        : null,
      practicalExam: subject.includePractical ? "Practical" : null,
      practicalCredit: subject.includePractical
        ? subject.practicalCredits ?? subject.subject?.defaultPracticalCredits ?? null
        : null,
      includeTheory: subject.includeTheory,
      includePractical: subject.includePractical,
      isLegacyRecord: true,
    });
  }

  return nextRows;
}

export function resolveDisplayTotalCredits(rows: AcademicRow[], fallbackTotal: string | number | undefined) {
  const fallbackNumber = Number(fallbackTotal ?? 0);
  if (rows.length === 0) {
    return Number.isFinite(fallbackNumber) ? fallbackNumber : "";
  }

  const derivedTotal = rows.reduce((sum, row) => {
    const theory = Number(row.credit ?? 0);
    const practical = Number(row.practicalCredit ?? 0);
    return sum + (Number.isFinite(theory) ? theory : 0) + (Number.isFinite(practical) ? practical : 0);
  }, 0);

  if (derivedTotal > 0) return derivedTotal;
  return Number.isFinite(fallbackNumber) ? fallbackNumber : "";
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

  const displayRows = useMemo(
    () => buildDisplayAcademicRows(rows, semesterData?.subjects),
    [rows, semesterData?.subjects]
  );
  const initialState = useMemo<RowState[]>(() => displayRows.map(createInitialRowState), [displayRows]);

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
  const hasDisplayRows = displayRows.length > 0;
  const hasSavedSemesterData = (semesterData?.subjects?.length ?? 0) > 0;
  const hasLegacyDisplayRows = displayRows.some((row) => row.isLegacyRecord);

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

    const updatedData = displayRows.map((row, idx) => {
      const subject = semesterData.subjects?.find((s) => rowMatchesSemesterSubject(row, s));
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
  }, [displayRows, semesterData, initialState]);

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
      const includesPractical = displayRows[idx]?.includePractical === true;
      return sum + toNum(row.total) + (includesPractical ? toNum(row.practicalTotal) : 0);
    }, 0);
  }, [data, displayRows]);

  const autoMarksScored = useMemo(() => Math.round(grandTotal), [grandTotal]);
  const resolvedTotalCredits = useMemo(
    () => resolveDisplayTotalCredits(displayRows, totalCredits),
    [displayRows, totalCredits]
  );

  const handleSave = async () => {
    if (!canEdit) return;

    clearValidationFeedback();

    try {
      let successMessage: string | null = null;

      const semesterResponse = await updateSemesterGPA(semester, {
        marksScored: autoMarksScored,
      });
      successMessage = semesterResponse.message;

      for (let i = 0; i < displayRows.length; i++) {
        const row = displayRows[i];
        const state = data[i];
        if (!row || !state) continue;
        const hasTheoryComponent = row.includeTheory !== false;
        const hasPracticalComponent = row.includePractical === true;
        const shouldAllowTheoryGrade = toNum(row.credit ?? undefined) > 0;
        const shouldAllowPracticalGrade = toNum(row.practicalCredit ?? undefined) > 0;
        const canPersistRow = !row.isLegacyRecord && Boolean(row.subjectId);

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

        if (!canPersistRow) {
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
      displayRows.map((row, idx) => {
        const subject = semesterData.subjects?.find((s) => rowMatchesSemesterSubject(row, s));
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

  if (!hasDisplayRows && !hasSavedSemesterData) {
    return (
      <div className="rounded-md border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
        No academic records or course offerings are available for this semester yet.
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

      {hasLegacyDisplayRows ? (
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Showing legacy saved academics rows that do not match the current course offerings. These rows remain read-only until offerings are aligned.
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
          {displayRows.map((r, idx) => {
            const state = data[idx];
            if (!state) return null;
            const hasTheoryComponent = r.includeTheory !== false;
            const hasPracticalComponent = r.includePractical === true;
            const hasTheoryCredits = toNum(r.credit ?? undefined) > 0;
            const hasPracticalCredits = toNum(r.practicalCredit ?? undefined) > 0;
            const canEditRow = canEdit && !r.isLegacyRecord && Boolean(r.subjectId);

            return (
              <React.Fragment key={`${r.subjectId || r.subjectCode || r.subject}-${idx}`}>
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
                        disabled={!canEditRow || !isEditing || isSaving || !hasTheoryComponent}
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
                      disabled={!canEditRow || !isEditing || isSaving || !hasTheoryComponent}
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
                      disabled={!canEditRow || !isEditing || isSaving || !hasTheoryComponent || !hasTheoryCredits}
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
                        disabled={!canEditRow || !isEditing || isSaving}
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
                        disabled={!canEditRow || !isEditing || isSaving}
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
                        disabled={!canEditRow || !isEditing || isSaving || !hasPracticalCredits}
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
            <td className="border px-2 py-1">{resolvedTotalCredits}</td>
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
