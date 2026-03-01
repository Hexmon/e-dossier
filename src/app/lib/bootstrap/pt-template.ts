import { and, eq } from 'drizzle-orm';
import { db } from '@/app/db/client';
import {
  ptAttemptGrades,
  ptMotivationAwardFields,
  ptTaskScores,
  ptTasks,
  ptTypeAttempts,
  ptTypes,
} from '@/app/db/schema/training/physicalTraining';
import defaultPtTemplatePack from '@/app/lib/bootstrap/templates/pt/default.v1.json';
import type {
  PtAttemptTemplate,
  PtGradeBand,
  PtTaskScoreTemplate,
  PtTaskTemplate,
  PtTemplateApplyResult,
  PtTemplateApplyStats,
  PtTemplatePack,
  PtTemplateProfile,
  PtTypeTemplate,
} from '@/app/lib/bootstrap/types';

type ApplyPtTemplateProfileInput = {
  profile?: PtTemplateProfile;
  dryRun?: boolean;
  actorUserId?: string;
};

type MutableStats = {
  ptTypes: PtTemplateApplyStats;
  attempts: PtTemplateApplyStats;
  grades: PtTemplateApplyStats;
  tasks: PtTemplateApplyStats;
  taskScores: PtTemplateApplyStats;
  motivationFields: PtTemplateApplyStats;
};

type ApplyContext = {
  now: Date;
  dryRun: boolean;
  warnings: string[];
  stats: MutableStats;
};

type DbExecutor = Pick<typeof db, 'select' | 'insert' | 'update'>;

const DEFAULT_PROFILE: PtTemplateProfile = 'default';

const DEFAULT_TEMPLATE = defaultPtTemplatePack as PtTemplatePack;

class DryRunRollbackError extends Error {
  constructor(public readonly result: PtTemplateApplyResult) {
    super('PT template dry-run rollback');
  }
}

function createStats(): MutableStats {
  const unit = (): PtTemplateApplyStats => ({ created: 0, updated: 0, skipped: 0 });
  return {
    ptTypes: unit(),
    attempts: unit(),
    grades: unit(),
    tasks: unit(),
    taskScores: unit(),
    motivationFields: unit(),
  };
}

function toResult(ctx: ApplyContext, profile: PtTemplateProfile): PtTemplateApplyResult {
  const createdCount =
    ctx.stats.ptTypes.created +
    ctx.stats.attempts.created +
    ctx.stats.grades.created +
    ctx.stats.tasks.created +
    ctx.stats.taskScores.created +
    ctx.stats.motivationFields.created;

  const updatedCount =
    ctx.stats.ptTypes.updated +
    ctx.stats.attempts.updated +
    ctx.stats.grades.updated +
    ctx.stats.tasks.updated +
    ctx.stats.taskScores.updated +
    ctx.stats.motivationFields.updated;

  const skippedCount =
    ctx.stats.ptTypes.skipped +
    ctx.stats.attempts.skipped +
    ctx.stats.grades.skipped +
    ctx.stats.tasks.skipped +
    ctx.stats.taskScores.skipped +
    ctx.stats.motivationFields.skipped;

  return {
    module: 'pt',
    profile,
    dryRun: ctx.dryRun,
    createdCount,
    updatedCount,
    skippedCount,
    warnings: ctx.warnings,
    stats: ctx.stats,
  };
}

function markCreated(stats: PtTemplateApplyStats): void {
  stats.created += 1;
}

function markUpdated(stats: PtTemplateApplyStats): void {
  stats.updated += 1;
}

function markSkipped(stats: PtTemplateApplyStats): void {
  stats.skipped += 1;
}

function normalizeNullable(value: unknown): unknown {
  return value ?? null;
}

function needsChange<T extends Record<string, unknown>>(
  current: Record<string, unknown>,
  next: T
): boolean {
  return Object.entries(next).some(([key, value]) => normalizeNullable(current[key]) !== normalizeNullable(value));
}

function selectPack(profile: PtTemplateProfile = DEFAULT_PROFILE): PtTemplatePack {
  if (profile !== DEFAULT_PROFILE) {
    throw new Error(`Unsupported PT template profile "${profile}". Supported: ${DEFAULT_PROFILE}`);
  }
  return DEFAULT_TEMPLATE;
}

export function getPtTemplatePack(profile: PtTemplateProfile = DEFAULT_PROFILE): PtTemplatePack {
  return selectPack(profile);
}

async function upsertPtType(
  tx: DbExecutor,
  ctx: ApplyContext,
  semester: number,
  templateType: PtTypeTemplate
): Promise<string> {
  const [existing] = await tx
    .select({
      id: ptTypes.id,
      title: ptTypes.title,
      description: ptTypes.description,
      maxTotalMarks: ptTypes.maxTotalMarks,
      sortOrder: ptTypes.sortOrder,
      isActive: ptTypes.isActive,
      deletedAt: ptTypes.deletedAt,
    })
    .from(ptTypes)
    .where(and(eq(ptTypes.semester, semester), eq(ptTypes.code, templateType.code)))
    .limit(1);

  if (!existing) {
    const [created] = await tx
      .insert(ptTypes)
      .values({
        semester,
        code: templateType.code,
        title: templateType.title,
        description: templateType.description ?? null,
        maxTotalMarks: templateType.maxTotalMarks,
        sortOrder: templateType.sortOrder,
        isActive: templateType.isActive ?? true,
        createdAt: ctx.now,
        updatedAt: ctx.now,
      })
      .returning({ id: ptTypes.id });
    markCreated(ctx.stats.ptTypes);
    return created.id;
  }

  const patch = {
    title: templateType.title,
    description: templateType.description ?? null,
    maxTotalMarks: templateType.maxTotalMarks,
    sortOrder: templateType.sortOrder,
    isActive: templateType.isActive ?? true,
    deletedAt: null as Date | null,
  };

  if (!needsChange(existing, patch)) {
    markSkipped(ctx.stats.ptTypes);
    return existing.id;
  }

  await tx.update(ptTypes).set({ ...patch, updatedAt: ctx.now }).where(eq(ptTypes.id, existing.id));
  markUpdated(ctx.stats.ptTypes);
  return existing.id;
}

async function upsertAttempt(
  tx: DbExecutor,
  ctx: ApplyContext,
  ptTypeId: string,
  templateAttempt: PtAttemptTemplate
): Promise<string> {
  const [existing] = await tx
    .select({
      id: ptTypeAttempts.id,
      label: ptTypeAttempts.label,
      isCompensatory: ptTypeAttempts.isCompensatory,
      sortOrder: ptTypeAttempts.sortOrder,
      isActive: ptTypeAttempts.isActive,
      deletedAt: ptTypeAttempts.deletedAt,
    })
    .from(ptTypeAttempts)
    .where(and(eq(ptTypeAttempts.ptTypeId, ptTypeId), eq(ptTypeAttempts.code, templateAttempt.code)))
    .limit(1);

  if (!existing) {
    const [created] = await tx
      .insert(ptTypeAttempts)
      .values({
        ptTypeId,
        code: templateAttempt.code,
        label: templateAttempt.label,
        isCompensatory: templateAttempt.isCompensatory,
        sortOrder: templateAttempt.sortOrder,
        isActive: templateAttempt.isActive ?? true,
        createdAt: ctx.now,
        updatedAt: ctx.now,
      })
      .returning({ id: ptTypeAttempts.id });
    markCreated(ctx.stats.attempts);
    return created.id;
  }

  const patch = {
    label: templateAttempt.label,
    isCompensatory: templateAttempt.isCompensatory,
    sortOrder: templateAttempt.sortOrder,
    isActive: templateAttempt.isActive ?? true,
    deletedAt: null as Date | null,
  };

  if (!needsChange(existing, patch)) {
    markSkipped(ctx.stats.attempts);
    return existing.id;
  }

  await tx.update(ptTypeAttempts).set({ ...patch, updatedAt: ctx.now }).where(eq(ptTypeAttempts.id, existing.id));
  markUpdated(ctx.stats.attempts);
  return existing.id;
}

async function upsertGrade(
  tx: DbExecutor,
  ctx: ApplyContext,
  ptAttemptId: string,
  templateGrade: PtGradeBand
): Promise<string> {
  const [existing] = await tx
    .select({
      id: ptAttemptGrades.id,
      label: ptAttemptGrades.label,
      sortOrder: ptAttemptGrades.sortOrder,
      isActive: ptAttemptGrades.isActive,
      deletedAt: ptAttemptGrades.deletedAt,
    })
    .from(ptAttemptGrades)
    .where(and(eq(ptAttemptGrades.ptAttemptId, ptAttemptId), eq(ptAttemptGrades.code, templateGrade.code)))
    .limit(1);

  if (!existing) {
    const [created] = await tx
      .insert(ptAttemptGrades)
      .values({
        ptAttemptId,
        code: templateGrade.code,
        label: templateGrade.label,
        sortOrder: templateGrade.sortOrder,
        isActive: templateGrade.isActive ?? true,
        createdAt: ctx.now,
        updatedAt: ctx.now,
      })
      .returning({ id: ptAttemptGrades.id });
    markCreated(ctx.stats.grades);
    return created.id;
  }

  const patch = {
    label: templateGrade.label,
    sortOrder: templateGrade.sortOrder,
    isActive: templateGrade.isActive ?? true,
    deletedAt: null as Date | null,
  };

  if (!needsChange(existing, patch)) {
    markSkipped(ctx.stats.grades);
    return existing.id;
  }

  await tx.update(ptAttemptGrades).set({ ...patch, updatedAt: ctx.now }).where(eq(ptAttemptGrades.id, existing.id));
  markUpdated(ctx.stats.grades);
  return existing.id;
}

async function upsertTask(
  tx: DbExecutor,
  ctx: ApplyContext,
  ptTypeId: string,
  templateTask: PtTaskTemplate
): Promise<string> {
  const [existing] = await tx
    .select({
      id: ptTasks.id,
      maxMarks: ptTasks.maxMarks,
      sortOrder: ptTasks.sortOrder,
      deletedAt: ptTasks.deletedAt,
    })
    .from(ptTasks)
    .where(and(eq(ptTasks.ptTypeId, ptTypeId), eq(ptTasks.title, templateTask.title)))
    .limit(1);

  if (!existing) {
    const [created] = await tx
      .insert(ptTasks)
      .values({
        ptTypeId,
        title: templateTask.title,
        maxMarks: templateTask.maxMarks,
        sortOrder: templateTask.sortOrder,
        createdAt: ctx.now,
        updatedAt: ctx.now,
      })
      .returning({ id: ptTasks.id });
    markCreated(ctx.stats.tasks);
    return created.id;
  }

  const patch = {
    maxMarks: templateTask.maxMarks,
    sortOrder: templateTask.sortOrder,
    deletedAt: null as Date | null,
  };

  if (!needsChange(existing, patch)) {
    markSkipped(ctx.stats.tasks);
    return existing.id;
  }

  await tx.update(ptTasks).set({ ...patch, updatedAt: ctx.now }).where(eq(ptTasks.id, existing.id));
  markUpdated(ctx.stats.tasks);
  return existing.id;
}

async function upsertTaskScore(
  tx: DbExecutor,
  ctx: ApplyContext,
  ptTaskId: string,
  ptAttemptId: string,
  ptAttemptGradeId: string,
  templateScore: PtTaskScoreTemplate
): Promise<void> {
  const [existing] = await tx
    .select({
      id: ptTaskScores.id,
      maxMarks: ptTaskScores.maxMarks,
    })
    .from(ptTaskScores)
    .where(
      and(
        eq(ptTaskScores.ptTaskId, ptTaskId),
        eq(ptTaskScores.ptAttemptId, ptAttemptId),
        eq(ptTaskScores.ptAttemptGradeId, ptAttemptGradeId)
      )
    )
    .limit(1);

  if (!existing) {
    await tx.insert(ptTaskScores).values({
      ptTaskId,
      ptAttemptId,
      ptAttemptGradeId,
      maxMarks: templateScore.maxMarks,
      createdAt: ctx.now,
      updatedAt: ctx.now,
    });
    markCreated(ctx.stats.taskScores);
    return;
  }

  if (existing.maxMarks === templateScore.maxMarks) {
    markSkipped(ctx.stats.taskScores);
    return;
  }

  await tx
    .update(ptTaskScores)
    .set({ maxMarks: templateScore.maxMarks, updatedAt: ctx.now })
    .where(eq(ptTaskScores.id, existing.id));
  markUpdated(ctx.stats.taskScores);
}

async function upsertMotivationField(
  tx: DbExecutor,
  ctx: ApplyContext,
  semester: number,
  label: string,
  sortOrder: number,
  isActive: boolean
): Promise<void> {
  const [existing] = await tx
    .select({
      id: ptMotivationAwardFields.id,
      sortOrder: ptMotivationAwardFields.sortOrder,
      isActive: ptMotivationAwardFields.isActive,
      deletedAt: ptMotivationAwardFields.deletedAt,
    })
    .from(ptMotivationAwardFields)
    .where(and(eq(ptMotivationAwardFields.semester, semester), eq(ptMotivationAwardFields.label, label)))
    .limit(1);

  if (!existing) {
    await tx.insert(ptMotivationAwardFields).values({
      semester,
      label,
      sortOrder,
      isActive,
      createdAt: ctx.now,
      updatedAt: ctx.now,
    });
    markCreated(ctx.stats.motivationFields);
    return;
  }

  const patch = {
    sortOrder,
    isActive,
    deletedAt: null as Date | null,
  };

  if (!needsChange(existing, patch)) {
    markSkipped(ctx.stats.motivationFields);
    return;
  }

  await tx
    .update(ptMotivationAwardFields)
    .set({ ...patch, updatedAt: ctx.now })
    .where(eq(ptMotivationAwardFields.id, existing.id));
  markUpdated(ctx.stats.motivationFields);
}

async function applyPackWithClient(tx: DbExecutor, pack: PtTemplatePack, ctx: ApplyContext): Promise<void> {
  const semesters = [...pack.semesters].sort((a, b) => a.semester - b.semester);

  for (const semesterTemplate of semesters) {
    const types = [...semesterTemplate.ptTypes].sort((a, b) => a.sortOrder - b.sortOrder);

    for (const templateType of types) {
      const ptTypeId = await upsertPtType(tx, ctx, semesterTemplate.semester, templateType);

      const attemptIdByCode = new Map<string, string>();
      const gradeIdByAttemptAndCode = new Map<string, string>();

      const attempts = [...templateType.attempts].sort((a, b) => a.sortOrder - b.sortOrder);
      for (const templateAttempt of attempts) {
        const attemptId = await upsertAttempt(tx, ctx, ptTypeId, templateAttempt);
        attemptIdByCode.set(templateAttempt.code, attemptId);

        const grades = [...templateAttempt.grades].sort((a, b) => a.sortOrder - b.sortOrder);
        for (const templateGrade of grades) {
          const gradeId = await upsertGrade(tx, ctx, attemptId, templateGrade);
          gradeIdByAttemptAndCode.set(`${templateAttempt.code}::${templateGrade.code}`, gradeId);
        }
      }

      const taskIdByTitle = new Map<string, string>();
      const tasks = [...templateType.tasks].sort((a, b) => a.sortOrder - b.sortOrder);
      for (const templateTask of tasks) {
        const taskId = await upsertTask(tx, ctx, ptTypeId, templateTask);
        taskIdByTitle.set(templateTask.title, taskId);
      }

      for (const templateTask of tasks) {
        const ptTaskId = taskIdByTitle.get(templateTask.title);
        if (!ptTaskId) continue;

        for (const templateScore of templateTask.scoreMatrix) {
          const ptAttemptId = attemptIdByCode.get(templateScore.attemptCode);
          if (!ptAttemptId) {
            ctx.warnings.push(
              `Missing attempt "${templateScore.attemptCode}" for task "${templateTask.title}" in semester ${semesterTemplate.semester}, type ${templateType.code}.`
            );
            continue;
          }

          const gradeKey = `${templateScore.attemptCode}::${templateScore.gradeCode}`;
          const ptAttemptGradeId = gradeIdByAttemptAndCode.get(gradeKey);
          if (!ptAttemptGradeId) {
            ctx.warnings.push(
              `Missing grade "${templateScore.gradeCode}" for attempt "${templateScore.attemptCode}" in task "${templateTask.title}" (semester ${semesterTemplate.semester}, type ${templateType.code}).`
            );
            continue;
          }

          await upsertTaskScore(tx, ctx, ptTaskId, ptAttemptId, ptAttemptGradeId, templateScore);
        }
      }
    }

    const motivationFields = [...semesterTemplate.motivationFields].sort((a, b) => a.sortOrder - b.sortOrder);
    for (const field of motivationFields) {
      await upsertMotivationField(
        tx,
        ctx,
        semesterTemplate.semester,
        field.label,
        field.sortOrder,
        field.isActive ?? true
      );
    }
  }
}

export async function applyPtTemplateProfile({
  profile = DEFAULT_PROFILE,
  dryRun = false,
}: ApplyPtTemplateProfileInput): Promise<PtTemplateApplyResult> {
  const pack = selectPack(profile);
  const context: ApplyContext = {
    now: new Date(),
    dryRun,
    warnings: [],
    stats: createStats(),
  };

  if (dryRun) {
    try {
      await db.transaction(async (tx) => {
        await applyPackWithClient(tx, pack, context);
        throw new DryRunRollbackError(toResult(context, profile));
      });
    } catch (error) {
      if (error instanceof DryRunRollbackError) {
        return error.result;
      }
      throw error;
    }
    return toResult(context, profile);
  }

  return db.transaction(async (tx) => {
    await applyPackWithClient(tx, pack, context);
    return toResult(context, profile);
  });
}
