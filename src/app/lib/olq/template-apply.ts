import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/app/db/client';
import { courses } from '@/app/db/schema/training/courses';
import { ocOlqCategories, ocOlqSubtitles } from '@/app/db/schema/training/oc';
import { ApiError } from '@/app/lib/http';
import { getOlqDefaultTemplatePack } from '@/app/lib/olq/default-template';

export type OlqTemplateApplyScope = 'course' | 'all';
export type OlqTemplateApplyMode = 'replace' | 'upsert_missing';

export type OlqTemplateApplyCourseResult = {
  courseId: string;
  status: 'ok' | 'error';
  categoriesCreated: number;
  categoriesUpdated: number;
  categoriesSkipped: number;
  subtitlesCreated: number;
  subtitlesUpdated: number;
  subtitlesSkipped: number;
  warnings: string[];
  error?: string;
};

export type OlqTemplateApplyResult = {
  scope: OlqTemplateApplyScope;
  dryRun: boolean;
  mode: OlqTemplateApplyMode;
  totalCourses: number;
  successCount: number;
  errorCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  results: OlqTemplateApplyCourseResult[];
};

export type ApplyOlqTemplateInput = {
  scope: OlqTemplateApplyScope;
  courseId?: string;
  dryRun?: boolean;
  mode?: OlqTemplateApplyMode;
  actorUserId?: string;
};

type TxExecutor = Pick<typeof db, 'select' | 'insert' | 'update'>;

class DryRunRollbackError extends Error {
  constructor(public readonly result: OlqTemplateApplyCourseResult) {
    super('OLQ template dry-run rollback');
  }
}

function emptyCourseResult(courseId: string): OlqTemplateApplyCourseResult {
  return {
    courseId,
    status: 'ok',
    categoriesCreated: 0,
    categoriesUpdated: 0,
    categoriesSkipped: 0,
    subtitlesCreated: 0,
    subtitlesUpdated: 0,
    subtitlesSkipped: 0,
    warnings: [],
  };
}

function hasChange(current: unknown, next: unknown): boolean {
  return (current ?? null) !== (next ?? null);
}

async function applyForCourse(
  tx: TxExecutor,
  courseId: string,
  mode: OlqTemplateApplyMode
): Promise<OlqTemplateApplyCourseResult> {
  const pack = getOlqDefaultTemplatePack();
  const now = new Date();
  const result = emptyCourseResult(courseId);

  const existingCategories = await tx
    .select({
      id: ocOlqCategories.id,
      code: ocOlqCategories.code,
      title: ocOlqCategories.title,
      description: ocOlqCategories.description,
      displayOrder: ocOlqCategories.displayOrder,
      isActive: ocOlqCategories.isActive,
      updatedAt: ocOlqCategories.updatedAt,
    })
    .from(ocOlqCategories)
    .where(eq(ocOlqCategories.courseId, courseId));

  if (mode === 'replace') {
    const activeCategoryIds = existingCategories.filter((row) => row.isActive).map((row) => row.id);
    if (activeCategoryIds.length > 0) {
      await tx
        .update(ocOlqSubtitles)
        .set({ isActive: false, updatedAt: now })
        .where(and(inArray(ocOlqSubtitles.categoryId, activeCategoryIds), eq(ocOlqSubtitles.isActive, true)));
    }

    await tx
      .update(ocOlqCategories)
      .set({ isActive: false, updatedAt: now })
      .where(and(eq(ocOlqCategories.courseId, courseId), eq(ocOlqCategories.isActive, true)));

    for (const category of pack.categories) {
      const [createdCategory] = await tx
        .insert(ocOlqCategories)
        .values({
          courseId,
          code: category.code,
          title: category.title,
          description: category.description,
          displayOrder: category.displayOrder,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: ocOlqCategories.id });
      result.categoriesCreated += 1;

      for (const subtitle of category.subtitles) {
        await tx.insert(ocOlqSubtitles).values({
          categoryId: createdCategory.id,
          subtitle: subtitle.subtitle,
          maxMarks: subtitle.maxMarks,
          displayOrder: subtitle.displayOrder,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        result.subtitlesCreated += 1;
      }
    }

    return result;
  }

  const existingByCode = new Map<string, typeof existingCategories>();
  for (const row of existingCategories) {
    const list = existingByCode.get(row.code) ?? [];
    list.push(row);
    existingByCode.set(row.code, list);
  }

  for (const category of pack.categories) {
    const candidates = existingByCode.get(category.code) ?? [];
    if (candidates.length > 1) {
      result.warnings.push(
        `Multiple categories found for code "${category.code}" in course ${courseId}; updating the active/latest row.`
      );
    }

    const selectedCategory =
      candidates.find((candidate) => candidate.isActive) ??
      candidates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];

    let categoryId: string;
    if (!selectedCategory) {
      const [createdCategory] = await tx
        .insert(ocOlqCategories)
        .values({
          courseId,
          code: category.code,
          title: category.title,
          description: category.description,
          displayOrder: category.displayOrder,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: ocOlqCategories.id });
      categoryId = createdCategory.id;
      result.categoriesCreated += 1;
    } else {
      categoryId = selectedCategory.id;
      const categoryChanged =
        hasChange(selectedCategory.title, category.title) ||
        hasChange(selectedCategory.description, category.description) ||
        hasChange(selectedCategory.displayOrder, category.displayOrder) ||
        hasChange(selectedCategory.isActive, true);

      if (categoryChanged) {
        await tx
          .update(ocOlqCategories)
          .set({
            title: category.title,
            description: category.description,
            displayOrder: category.displayOrder,
            isActive: true,
            updatedAt: now,
          })
          .where(eq(ocOlqCategories.id, selectedCategory.id));
        result.categoriesUpdated += 1;
      } else {
        result.categoriesSkipped += 1;
      }
    }

    const existingSubtitles = await tx
      .select({
        id: ocOlqSubtitles.id,
        subtitle: ocOlqSubtitles.subtitle,
        maxMarks: ocOlqSubtitles.maxMarks,
        displayOrder: ocOlqSubtitles.displayOrder,
        isActive: ocOlqSubtitles.isActive,
      })
      .from(ocOlqSubtitles)
      .where(eq(ocOlqSubtitles.categoryId, categoryId));

    const subtitleByName = new Map(existingSubtitles.map((row) => [row.subtitle, row]));
    for (const subtitle of category.subtitles) {
      const existingSubtitle = subtitleByName.get(subtitle.subtitle);
      if (!existingSubtitle) {
        await tx.insert(ocOlqSubtitles).values({
          categoryId,
          subtitle: subtitle.subtitle,
          maxMarks: subtitle.maxMarks,
          displayOrder: subtitle.displayOrder,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        result.subtitlesCreated += 1;
        continue;
      }

      const subtitleChanged =
        hasChange(existingSubtitle.maxMarks, subtitle.maxMarks) ||
        hasChange(existingSubtitle.displayOrder, subtitle.displayOrder) ||
        hasChange(existingSubtitle.isActive, true);
      if (subtitleChanged) {
        await tx
          .update(ocOlqSubtitles)
          .set({
            maxMarks: subtitle.maxMarks,
            displayOrder: subtitle.displayOrder,
            isActive: true,
            updatedAt: now,
          })
          .where(eq(ocOlqSubtitles.id, existingSubtitle.id));
        result.subtitlesUpdated += 1;
      } else {
        result.subtitlesSkipped += 1;
      }
    }
  }

  return result;
}

async function applyForCourseWithDryRun(
  courseId: string,
  mode: OlqTemplateApplyMode,
  dryRun: boolean
): Promise<OlqTemplateApplyCourseResult> {
  try {
    const committed = await db.transaction(async (tx) => {
      const result = await applyForCourse(tx, courseId, mode);
      if (dryRun) {
        throw new DryRunRollbackError(result);
      }
      return result;
    });

    return committed;
  } catch (error) {
    if (error instanceof DryRunRollbackError) {
      return error.result;
    }
    throw error;
  }
}

async function resolveTargetCourses(scope: OlqTemplateApplyScope, courseId?: string): Promise<string[]> {
  if (scope === 'course') {
    if (!courseId) {
      throw new ApiError(400, 'courseId is required when scope is "course"', 'bad_request');
    }
    const [row] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.id, courseId), isNull(courses.deletedAt)))
      .limit(1);
    if (!row) {
      throw new ApiError(404, 'Course not found', 'not_found');
    }
    return [row.id];
  }

  const rows = await db
    .select({ id: courses.id })
    .from(courses)
    .where(isNull(courses.deletedAt))
    .orderBy(courses.code);
  return rows.map((row) => row.id);
}

export async function applyOlqDefaultTemplate(
  input: ApplyOlqTemplateInput
): Promise<OlqTemplateApplyResult> {
  const scope = input.scope;
  const mode = input.mode ?? 'replace';
  const dryRun = input.dryRun ?? false;

  const targetCourseIds = await resolveTargetCourses(scope, input.courseId);
  const results: OlqTemplateApplyCourseResult[] = [];

  for (const courseId of targetCourseIds) {
    try {
      const result = await applyForCourseWithDryRun(courseId, mode, dryRun);
      results.push(result);
    } catch (error) {
      results.push({
        ...emptyCourseResult(courseId),
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to apply template.',
      });
    }
  }

  const successCount = results.filter((row) => row.status === 'ok').length;
  const errorCount = results.length - successCount;
  const createdCount = results.reduce(
    (sum, row) => sum + row.categoriesCreated + row.subtitlesCreated,
    0
  );
  const updatedCount = results.reduce(
    (sum, row) => sum + row.categoriesUpdated + row.subtitlesUpdated,
    0
  );
  const skippedCount = results.reduce(
    (sum, row) => sum + row.categoriesSkipped + row.subtitlesSkipped,
    0
  );

  return {
    scope,
    dryRun,
    mode,
    totalCourses: targetCourseIds.length,
    successCount,
    errorCount,
    createdCount,
    updatedCount,
    skippedCount,
    results,
  };
}
