import { and, eq } from 'drizzle-orm';
import { db } from '@/app/db/client';
import { trainingCampActivities, trainingCamps } from '@/app/db/schema/training/oc';
import defaultCampTemplatePack from '@/app/lib/bootstrap/templates/camp/default.v1.json';
import type {
  CampActivityTemplate,
  CampTemplate,
  CampTemplateApplyResult,
  CampTemplateProfile,
  CampTemplatePack,
  PtTemplateApplyStats,
} from '@/app/lib/bootstrap/types';

type ApplyCampTemplateProfileInput = {
  profile?: CampTemplateProfile;
  dryRun?: boolean;
  actorUserId?: string;
};

type MutableStats = {
  camps: PtTemplateApplyStats;
  activities: PtTemplateApplyStats;
};

type ApplyContext = {
  now: Date;
  dryRun: boolean;
  warnings: string[];
  stats: MutableStats;
};

type DbExecutor = Pick<typeof db, 'select' | 'insert' | 'update'>;

const DEFAULT_PROFILE: CampTemplateProfile = 'default';
const DEFAULT_TEMPLATE = defaultCampTemplatePack as CampTemplatePack;

class DryRunRollbackError extends Error {
  constructor(public readonly result: CampTemplateApplyResult) {
    super('Camp template dry-run rollback');
  }
}

function createStats(): MutableStats {
  const unit = (): PtTemplateApplyStats => ({ created: 0, updated: 0, skipped: 0 });
  return {
    camps: unit(),
    activities: unit(),
  };
}

function selectPack(profile: CampTemplateProfile = DEFAULT_PROFILE): CampTemplatePack {
  if (profile !== DEFAULT_PROFILE) {
    throw new Error(`Unsupported camp template profile "${profile}". Supported: ${DEFAULT_PROFILE}`);
  }
  return DEFAULT_TEMPLATE;
}

export function getCampTemplatePack(profile: CampTemplateProfile = DEFAULT_PROFILE): CampTemplatePack {
  return selectPack(profile);
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

function toResult(ctx: ApplyContext, profile: CampTemplateProfile): CampTemplateApplyResult {
  const createdCount = ctx.stats.camps.created + ctx.stats.activities.created;
  const updatedCount = ctx.stats.camps.updated + ctx.stats.activities.updated;
  const skippedCount = ctx.stats.camps.skipped + ctx.stats.activities.skipped;

  return {
    module: 'camp',
    profile,
    dryRun: ctx.dryRun,
    createdCount,
    updatedCount,
    skippedCount,
    warnings: ctx.warnings,
    stats: ctx.stats,
  };
}

async function upsertCamp(
  tx: DbExecutor,
  ctx: ApplyContext,
  templateCamp: CampTemplate
): Promise<string> {
  const [existing] = await tx
    .select({
      id: trainingCamps.id,
      sortOrder: trainingCamps.sortOrder,
      maxTotalMarks: trainingCamps.maxTotalMarks,
      performanceTitle: trainingCamps.performanceTitle,
      performanceGuidance: trainingCamps.performanceGuidance,
      signaturePrimaryLabel: trainingCamps.signaturePrimaryLabel,
      signatureSecondaryLabel: trainingCamps.signatureSecondaryLabel,
      noteLine1: trainingCamps.noteLine1,
      noteLine2: trainingCamps.noteLine2,
      showAggregateSummary: trainingCamps.showAggregateSummary,
      deletedAt: trainingCamps.deletedAt,
    })
    .from(trainingCamps)
    .where(
      and(
        eq(trainingCamps.semester, templateCamp.semester),
        eq(trainingCamps.name, templateCamp.name),
      )
    )
    .limit(1);

  if (!existing) {
    const [created] = await tx
      .insert(trainingCamps)
      .values({
        semester: templateCamp.semester,
        name: templateCamp.name,
        sortOrder: templateCamp.sortOrder,
        maxTotalMarks: templateCamp.maxTotalMarks,
        performanceTitle: templateCamp.performanceTitle ?? null,
        performanceGuidance: templateCamp.performanceGuidance ?? null,
        signaturePrimaryLabel: templateCamp.signaturePrimaryLabel ?? null,
        signatureSecondaryLabel: templateCamp.signatureSecondaryLabel ?? null,
        noteLine1: templateCamp.noteLine1 ?? null,
        noteLine2: templateCamp.noteLine2 ?? null,
        showAggregateSummary: templateCamp.showAggregateSummary ?? false,
        createdAt: ctx.now,
        updatedAt: ctx.now,
      })
      .returning({ id: trainingCamps.id });
    markCreated(ctx.stats.camps);
    return created.id;
  }

  const patch = {
    sortOrder: templateCamp.sortOrder,
    maxTotalMarks: templateCamp.maxTotalMarks,
    performanceTitle: templateCamp.performanceTitle ?? null,
    performanceGuidance: templateCamp.performanceGuidance ?? null,
    signaturePrimaryLabel: templateCamp.signaturePrimaryLabel ?? null,
    signatureSecondaryLabel: templateCamp.signatureSecondaryLabel ?? null,
    noteLine1: templateCamp.noteLine1 ?? null,
    noteLine2: templateCamp.noteLine2 ?? null,
    showAggregateSummary: templateCamp.showAggregateSummary ?? false,
    deletedAt: null as Date | null,
  };

  if (!needsChange(existing, patch)) {
    markSkipped(ctx.stats.camps);
    return existing.id;
  }

  await tx.update(trainingCamps).set({ ...patch, updatedAt: ctx.now }).where(eq(trainingCamps.id, existing.id));
  markUpdated(ctx.stats.camps);
  return existing.id;
}

async function upsertActivity(
  tx: DbExecutor,
  ctx: ApplyContext,
  trainingCampId: string,
  templateActivity: CampActivityTemplate
): Promise<void> {
  const [existing] = await tx
    .select({
      id: trainingCampActivities.id,
      defaultMaxMarks: trainingCampActivities.defaultMaxMarks,
      sortOrder: trainingCampActivities.sortOrder,
      deletedAt: trainingCampActivities.deletedAt,
    })
    .from(trainingCampActivities)
    .where(
      and(
        eq(trainingCampActivities.trainingCampId, trainingCampId),
        eq(trainingCampActivities.name, templateActivity.name),
      )
    )
    .limit(1);

  if (!existing) {
    await tx.insert(trainingCampActivities).values({
      trainingCampId,
      name: templateActivity.name,
      defaultMaxMarks: templateActivity.defaultMaxMarks,
      sortOrder: templateActivity.sortOrder,
      createdAt: ctx.now,
      updatedAt: ctx.now,
    });
    markCreated(ctx.stats.activities);
    return;
  }

  const patch = {
    defaultMaxMarks: templateActivity.defaultMaxMarks,
    sortOrder: templateActivity.sortOrder,
    deletedAt: null as Date | null,
  };

  if (!needsChange(existing, patch)) {
    markSkipped(ctx.stats.activities);
    return;
  }

  await tx
    .update(trainingCampActivities)
    .set({ ...patch, updatedAt: ctx.now })
    .where(eq(trainingCampActivities.id, existing.id));
  markUpdated(ctx.stats.activities);
}

export async function applyCampTemplateProfile(
  input: ApplyCampTemplateProfileInput = {}
): Promise<CampTemplateApplyResult> {
  const profile = input.profile ?? DEFAULT_PROFILE;
  const dryRun = input.dryRun ?? false;
  const pack = selectPack(profile);

  const ctx: ApplyContext = {
    now: new Date(),
    dryRun,
    warnings: [],
    stats: createStats(),
  };

  try {
    await db.transaction(async (tx) => {
      for (const templateCamp of pack.camps) {
        const campId = await upsertCamp(tx, ctx, templateCamp);
        for (const templateActivity of templateCamp.activities) {
          await upsertActivity(tx, ctx, campId, templateActivity);
        }
      }

      if (ctx.dryRun) {
        throw new DryRunRollbackError(toResult(ctx, profile));
      }
    });
  } catch (error) {
    if (error instanceof DryRunRollbackError) {
      return error.result;
    }
    throw error;
  }

  return toResult(ctx, profile);
}

