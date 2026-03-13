import type {
  PTTemplateTask,
  PTTemplateTaskAttempt,
  PTTemplateType,
} from "@/app/lib/api/Physicaltrainingapi";
import type { PTBulkGetItem } from "@/app/lib/api/physicalTrainingBulkApi";

export type PTBulkTaskGradeOption = {
  gradeCode: string;
  scoreId: string;
  maxMarks: number;
};

export type PTBulkTaskAttemptOption = {
  attemptCode: string;
  grades: PTBulkTaskGradeOption[];
};

export type PTBulkTaskDefinition = {
  taskId: string;
  taskTitle: string;
  maxMarks: number;
  attempts: PTBulkTaskAttemptOption[];
};

export type PTBulkTaskSelection = {
  taskId: string;
  selectedAttemptCode: string;
  selectedGradeCode: string;
  selectedScoreId: string;
  marks: string;
  maxMarks: number;
};

export type PTBulkTaskSelectionMap = Record<string, Record<string, PTBulkTaskSelection>>;

function buildAttemptOptions(task: PTTemplateTask): PTBulkTaskAttemptOption[] {
  return (task.attempts ?? [])
    .map((attempt: PTTemplateTaskAttempt) => {
      const grades = (attempt.grades ?? [])
        .filter((grade) => typeof grade.scoreId === "string" && grade.scoreId.trim().length > 0)
        .map((grade) => ({
          gradeCode: grade.code,
          scoreId: grade.scoreId!,
          maxMarks: typeof grade.maxMarks === "number" ? grade.maxMarks : task.maxMarks,
        }));

      return {
        attemptCode: attempt.code,
        grades,
      };
    })
    .filter((attempt) => attempt.grades.length > 0);
}

export function buildPTBulkTaskDefinitions(type: PTTemplateType | null | undefined): PTBulkTaskDefinition[] {
  if (!type) return [];

  return (type.tasks ?? [])
    .map((task) => ({
      taskId: task.id,
      taskTitle: task.title,
      maxMarks: task.maxMarks,
      attempts: buildAttemptOptions(task),
    }))
    .filter((task) => task.attempts.length > 0);
}

export function buildAllPTBulkTaskDefinitions(types: PTTemplateType[] | null | undefined): PTBulkTaskDefinition[] {
  if (!types?.length) return [];
  return types.flatMap((type) => buildPTBulkTaskDefinitions(type));
}

export function getDefaultPTBulkTaskSelection(task: PTBulkTaskDefinition): PTBulkTaskSelection | null {
  const firstAttempt = task.attempts[0];
  const firstGrade = firstAttempt?.grades[0];
  if (!firstAttempt || !firstGrade) return null;

  return {
    taskId: task.taskId,
    selectedAttemptCode: firstAttempt.attemptCode,
    selectedGradeCode: firstGrade.gradeCode,
    selectedScoreId: firstGrade.scoreId,
    marks: String(firstGrade.maxMarks),
    maxMarks: firstGrade.maxMarks,
  };
}

export function findPTBulkGradeOption(
  task: PTBulkTaskDefinition,
  attemptCode: string,
  gradeCode: string,
): PTBulkTaskGradeOption | null {
  const attempt = task.attempts.find((item) => item.attemptCode === attemptCode);
  const grade = attempt?.grades.find((item) => item.gradeCode === gradeCode);
  return grade ?? null;
}

export function createPTBulkTaskSelection(
  task: PTBulkTaskDefinition,
  attemptCode: string,
  gradeCode: string,
  marks?: string | number,
): PTBulkTaskSelection | null {
  const grade = findPTBulkGradeOption(task, attemptCode, gradeCode);
  if (!grade) return null;

  return {
    taskId: task.taskId,
    selectedAttemptCode: attemptCode,
    selectedGradeCode: gradeCode,
    selectedScoreId: grade.scoreId,
    marks: marks !== undefined ? String(marks) : String(grade.maxMarks),
    maxMarks: grade.maxMarks,
  };
}

export function buildPTBulkInitialSelections(
  items: PTBulkGetItem[],
  taskDefinitions: PTBulkTaskDefinition[],
): PTBulkTaskSelectionMap {
  const taskById = new Map(taskDefinitions.map((task) => [task.taskId, task]));
  const taskIdByScoreId = new Map<string, string>();

  for (const task of taskDefinitions) {
    for (const attempt of task.attempts) {
      for (const grade of attempt.grades) {
        taskIdByScoreId.set(grade.scoreId, task.taskId);
      }
    }
  }

  const result: PTBulkTaskSelectionMap = {};

  for (const item of items) {
    for (const score of item.scores) {
      const taskId = score.ptTaskId ?? taskIdByScoreId.get(score.ptTaskScoreId);
      if (!taskId) continue;

      const task = taskById.get(taskId);
      if (!task) continue;

      const match = task.attempts
        .flatMap((attempt) =>
          attempt.grades.map((grade) => ({
            attemptCode: attempt.attemptCode,
            grade,
          })),
        )
        .find((entry) => entry.grade.scoreId === score.ptTaskScoreId);

      if (!match) continue;

      result[item.oc.id] = result[item.oc.id] ?? {};
      result[item.oc.id][taskId] = {
        taskId,
        selectedAttemptCode: match.attemptCode,
        selectedGradeCode: match.grade.gradeCode,
        selectedScoreId: match.grade.scoreId,
        marks: String(score.marksScored),
        maxMarks: match.grade.maxMarks,
      };
    }
  }

  return result;
}
