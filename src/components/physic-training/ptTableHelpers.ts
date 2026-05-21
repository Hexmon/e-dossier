"use client";

import {
  PhysicalTrainingScore,
  PhysicalTrainingTemplateRow,
  PhysicalTrainingTemplateTypeInfo,
} from "@/hooks/usePhysicalTraining";
import { resolvePtDraftMarks } from "@/app/lib/physical-training-attempts";

export interface AttemptGradeEntry {
  attemptCode: string;
  gradeCode: string;
  scoreId: string; // can be virtual
  maxMarks: number; // ✅ mapped from task.maxMarks (or grade.maxMarks)
}

export interface AttemptGroup {
  attemptCode: string;
  grades: AttemptGradeEntry[];
}

export interface PTTableRow {
  id: string;
  column1: number | string;
  column2: string; // test name (task title)
  column3: number; // status-linked marks used for validation/defaults
  column4: string; // category (attempt)
  column5: string; // status (grade)
  column6: number | null; // marks scored
  attemptGroups: AttemptGroup[];
  selectedAttempt: string;
  selectedGrade: string;
  selectedScoreId: string;
  originalScoreRowId?: string;
  originalScoreId?: string;
  originalMarksScored?: number | null;
}

const FALLBACK_TASK_LABEL = "Task";
const EMPTY_PLACEHOLDER = "—";

export function buildPTTableRows(
  templates: PhysicalTrainingTemplateRow[] | undefined,
  _semesterNum: number,
  scoreById: Map<string, PhysicalTrainingScore>
): PTTableRow[] {
  if (!templates || templates.length === 0) return [];

  // ✅ Keep rows even if scoreId is virtual; only drop truly invalid ids
  const templateRows = templates.filter((t) => typeof t.ptTaskScoreId === "string" && t.ptTaskScoreId.trim().length > 0);
  if (templateRows.length === 0) return [];

  const taskMap = new Map<string, AttemptGroup[]>();

  templateRows.forEach((template) => {
    const taskTitle = template.taskTitle ?? FALLBACK_TASK_LABEL;
    const attemptCode = template.attemptCode ?? EMPTY_PLACEHOLDER;
    const gradeCode = template.gradeCode ?? EMPTY_PLACEHOLDER;

    const groups = taskMap.get(taskTitle) ?? [];
    let attemptGroup = groups.find((g) => g.attemptCode === attemptCode);

    if (!attemptGroup) {
      attemptGroup = { attemptCode, grades: [] };
      groups.push(attemptGroup);
    }

    attemptGroup.grades.push({
      attemptCode,
      gradeCode,
      scoreId: template.ptTaskScoreId,
      maxMarks: template.maxMarks ?? 0, // ✅ mapped from template row (task.maxMarks)
    });

    taskMap.set(taskTitle, groups);
  });

  const rows: PTTableRow[] = [];
  taskMap.forEach((attemptGroups, taskTitle) => {
    const index = rows.length + 1;

    let selectedAttempt = "";
    let selectedGrade = "";
    let marks: number | null = null;
    let selectedScoreId = "";
    let maxMarks = 0;

    // Prefer an existing score match (real ids will match scoreById)
    for (const group of attemptGroups) {
      for (const grade of group.grades) {
        const score = scoreById.get(grade.scoreId);
        if (score) {
          selectedAttempt = group.attemptCode;
          selectedGrade = grade.gradeCode;
          marks = score.marksScored;
          selectedScoreId = grade.scoreId;
          maxMarks = grade.maxMarks;
          break;
        }
      }
      if (selectedScoreId) break;
    }

    rows.push({
      id: `${taskTitle.replace(/\s+/g, "-").toLowerCase()}-${index}`,
      column1: index,
      column2: taskTitle,
      column3: maxMarks,
      column4: selectedAttempt,
      column5: selectedGrade,
      column6: marks,
      attemptGroups,
      selectedAttempt,
      selectedGrade,
      selectedScoreId,
      originalScoreRowId: selectedScoreId ? scoreById.get(selectedScoreId)?.id : undefined,
      originalScoreId: selectedScoreId || undefined,
      originalMarksScored: selectedScoreId ? marks : undefined,
    });
  });

  return rows;
}

export function resolvePTTableRowAttemptChange(
  row: PTTableRow,
  attemptCode: string,
  scoreById: Map<string, PhysicalTrainingScore>,
): PTTableRow {
  const attemptGroup = row.attemptGroups.find((group) => group.attemptCode === attemptCode);
  const nextGrade = attemptGroup?.grades[0];
  if (!attemptGroup || !nextGrade) return row;

  const marks = resolvePtDraftMarks(
    attemptCode,
    nextGrade.maxMarks,
    scoreById.get(nextGrade.scoreId)?.marksScored ?? null,
  );

  return {
    ...row,
    selectedAttempt: attemptCode,
    column4: attemptCode,
    selectedGrade: nextGrade.gradeCode,
    column5: nextGrade.gradeCode,
    selectedScoreId: nextGrade.scoreId,
    column3: nextGrade.maxMarks,
    column6: marks,
  };
}

export function resolvePTTableRowGradeChange(
  row: PTTableRow,
  gradeCode: string,
  scoreById: Map<string, PhysicalTrainingScore>,
): PTTableRow {
  const attemptGroup = row.attemptGroups.find((group) => group.attemptCode === row.selectedAttempt);
  const grade = attemptGroup?.grades.find((item) => item.gradeCode === gradeCode);
  if (!grade) return row;

  const marks = resolvePtDraftMarks(
    row.selectedAttempt,
    grade.maxMarks,
    scoreById.get(grade.scoreId)?.marksScored ?? null,
  );

  return {
    ...row,
    selectedGrade: gradeCode,
    column5: gradeCode,
    selectedScoreId: grade.scoreId,
    column3: grade.maxMarks,
    column6: marks,
  };
}

export function buildPTUpdatePayloadFromRows(rows: PTTableRow[]): {
  scores: PhysicalTrainingScore[];
  deleteScoreIds: string[];
} {
  const scores: PhysicalTrainingScore[] = [];
  const deleteScoreIds = new Set<string>();

  for (const row of rows) {
    const hasSavedScore = Boolean(row.originalScoreRowId && row.originalScoreId);
    const hasCurrentScore = Boolean(row.selectedScoreId && !row.selectedScoreId.startsWith("virtual:"));
    const hasMarks = row.column6 !== null && row.column6 !== undefined;

    if (!hasCurrentScore || !hasMarks) {
      if (hasSavedScore && row.originalScoreRowId) {
        deleteScoreIds.add(row.originalScoreRowId);
      }
      continue;
    }

    const marksScored = Math.trunc(row.column6 ?? 0);
    const changedScore = row.originalScoreId !== row.selectedScoreId;
    const changedMarks = row.originalMarksScored !== marksScored;

    if (hasSavedScore && !changedScore && !changedMarks) {
      continue;
    }

    if (hasSavedScore && changedScore && row.originalScoreRowId) {
      deleteScoreIds.add(row.originalScoreRowId);
    }

    scores.push({
      ptTaskScoreId: row.selectedScoreId,
      marksScored,
      attemptCode: row.selectedAttempt,
      gradeCode: row.selectedGrade,
    });
  }

  return {
    scores,
    deleteScoreIds: Array.from(deleteScoreIds),
  };
}

export interface ResolvedTemplateType {
  code: string;
  title: string;
  maxTotalMarks: number;
  semester: number;
  rows: PhysicalTrainingTemplateRow[];
}

const normalizeKey = (value: string | undefined) =>
  (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function resolveTemplatesByType(
  templatesByType: Record<string, PhysicalTrainingTemplateRow[]> | undefined,
  templateMetaByType: Record<string, PhysicalTrainingTemplateTypeInfo> | undefined,
  targetKey: string
): ResolvedTemplateType | null {
  if (!templatesByType || Object.keys(templatesByType).length === 0) return null;

  const normalizedTarget = normalizeKey(targetKey);
  const keys = Object.keys(templatesByType);
  if (!keys.length) return null;

  const matchCandidates = keys.map((key) => {
    const metaTitle = templateMetaByType?.[key]?.title;
    return {
      key,
      normalizedKey: normalizeKey(key),
      normalizedTitle: normalizeKey(metaTitle),
    };
  });

  const directMatch =
    matchCandidates.find(
      (candidate) =>
        candidate.normalizedKey === normalizedTarget ||
        (candidate.normalizedTitle && candidate.normalizedTitle === normalizedTarget)
    )?.key ?? null;

  if (directMatch) {
    return buildResolvedType(directMatch, templatesByType, templateMetaByType);
  }

  if (normalizedTarget !== "") {
    const partialMatch =
      matchCandidates.find((candidate) => {
        const normalizedTitle = candidate.normalizedTitle;
        return (
          candidate.normalizedKey.includes(normalizedTarget) ||
          normalizedTarget.includes(candidate.normalizedKey) ||
          (normalizedTitle && normalizedTitle.includes(normalizedTarget)) ||
          (normalizedTitle && normalizedTarget.includes(normalizedTitle))
        );
      })?.key ?? null;

    if (partialMatch) {
      return buildResolvedType(partialMatch, templatesByType, templateMetaByType);
    }
  }

  return null;
}

function buildResolvedType(
  key: string,
  templatesByType: Record<string, PhysicalTrainingTemplateRow[]>,
  templateMetaByType: Record<string, PhysicalTrainingTemplateTypeInfo> | undefined
): ResolvedTemplateType {
  const rows = templatesByType[key] ?? [];
  const meta = templateMetaByType?.[key];
  const maxTotalMarks =
    meta?.maxTotalMarks ?? rows.reduce((sum, row) => sum + (row.maxMarks ?? 0), 0);

  return {
    code: key,
    title: meta?.title ?? key,
    maxTotalMarks,
    semester: meta?.semester ?? 0,
    rows,
  };
}




