import { eq } from 'drizzle-orm';
import { db } from '@/app/db/client';
import { academicGradingPolicySettings } from '@/app/db/schema/training/academicGradingPolicy';
import {
  DEFAULT_ACADEMIC_GRADING_POLICY,
  normalizeAcademicGradingPolicy,
  type AcademicGradingPolicy,
} from '@/app/lib/grading-policy';

const DEFAULT_SINGLETON_KEY = 'default';

export type AcademicGradingPolicyRecord = {
  id: string;
  singletonKey: string;
  letterGradeBands: AcademicGradingPolicy['letterGradeBands'];
  gradePointBands: AcademicGradingPolicy['gradePointBands'];
  sgpaFormulaTemplate: AcademicGradingPolicy['sgpaFormulaTemplate'];
  cgpaFormulaTemplate: AcademicGradingPolicy['cgpaFormulaTemplate'];
  roundingScale: number;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapRowToPolicy(row: Pick<
  AcademicGradingPolicyRecord,
  'letterGradeBands' | 'gradePointBands' | 'sgpaFormulaTemplate' | 'cgpaFormulaTemplate' | 'roundingScale'
>): AcademicGradingPolicy {
  return normalizeAcademicGradingPolicy({
    letterGradeBands: row.letterGradeBands,
    gradePointBands: row.gradePointBands,
    sgpaFormulaTemplate: row.sgpaFormulaTemplate,
    cgpaFormulaTemplate: row.cgpaFormulaTemplate,
    roundingScale: row.roundingScale,
  });
}

function isRelationMissingError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  if (code === '42P01') return true;
  const causeCode = (error as { cause?: { code?: string } }).cause?.code;
  return causeCode === '42P01';
}

export async function getOrCreateAcademicGradingPolicy(): Promise<AcademicGradingPolicyRecord> {
  const [existing] = await db
    .select()
    .from(academicGradingPolicySettings)
    .where(eq(academicGradingPolicySettings.singletonKey, DEFAULT_SINGLETON_KEY))
    .limit(1);

  if (existing) {
    const normalizedPolicy = mapRowToPolicy(existing);
    return {
      ...existing,
      ...normalizedPolicy,
    };
  }

  const now = new Date();
  const [created] = await db
    .insert(academicGradingPolicySettings)
    .values({
      singletonKey: DEFAULT_SINGLETON_KEY,
      letterGradeBands: DEFAULT_ACADEMIC_GRADING_POLICY.letterGradeBands,
      gradePointBands: DEFAULT_ACADEMIC_GRADING_POLICY.gradePointBands,
      sgpaFormulaTemplate: DEFAULT_ACADEMIC_GRADING_POLICY.sgpaFormulaTemplate,
      cgpaFormulaTemplate: DEFAULT_ACADEMIC_GRADING_POLICY.cgpaFormulaTemplate,
      roundingScale: DEFAULT_ACADEMIC_GRADING_POLICY.roundingScale,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return {
    ...created,
    ...DEFAULT_ACADEMIC_GRADING_POLICY,
  };
}

export async function getAcademicGradingPolicy(): Promise<AcademicGradingPolicy> {
  try {
    const record = await getOrCreateAcademicGradingPolicy();
    return {
      letterGradeBands: record.letterGradeBands,
      gradePointBands: record.gradePointBands,
      sgpaFormulaTemplate: record.sgpaFormulaTemplate,
      cgpaFormulaTemplate: record.cgpaFormulaTemplate,
      roundingScale: record.roundingScale,
    };
  } catch (error) {
    // Runtime fallback: if settings table is unavailable, continue with in-code canonical defaults.
    if (isRelationMissingError(error)) {
      return DEFAULT_ACADEMIC_GRADING_POLICY;
    }
    throw error;
  }
}

export async function updateAcademicGradingPolicy(
  input: Partial<AcademicGradingPolicy>,
  actorUserId: string | null
): Promise<{ before: AcademicGradingPolicyRecord; after: AcademicGradingPolicyRecord }> {
  const current = await getOrCreateAcademicGradingPolicy();
  const normalizedNextPolicy = normalizeAcademicGradingPolicy({
    letterGradeBands: input.letterGradeBands ?? current.letterGradeBands,
    gradePointBands: input.gradePointBands ?? current.gradePointBands,
    sgpaFormulaTemplate: input.sgpaFormulaTemplate ?? current.sgpaFormulaTemplate,
    cgpaFormulaTemplate: input.cgpaFormulaTemplate ?? current.cgpaFormulaTemplate,
    roundingScale: input.roundingScale ?? current.roundingScale,
  });

  const [updated] = await db
    .update(academicGradingPolicySettings)
    .set({
      letterGradeBands: normalizedNextPolicy.letterGradeBands,
      gradePointBands: normalizedNextPolicy.gradePointBands,
      sgpaFormulaTemplate: normalizedNextPolicy.sgpaFormulaTemplate,
      cgpaFormulaTemplate: normalizedNextPolicy.cgpaFormulaTemplate,
      roundingScale: normalizedNextPolicy.roundingScale,
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(academicGradingPolicySettings.id, current.id))
    .returning();

  return {
    before: current,
    after: {
      ...updated,
      ...normalizedNextPolicy,
    },
  };
}
