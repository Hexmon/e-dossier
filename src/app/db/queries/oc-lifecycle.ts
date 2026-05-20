import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/app/db/client';
import {
  ocCadets,
  ocCourseEnrollments,
  ocPersonal,
  ocPreCommission,
  ocReconciliationAudit,
} from '@/app/db/schema/training/oc';
import { ApiError } from '@/app/lib/http';

type DbLike = Pick<typeof db, 'select' | 'insert' | 'update'>;
type OcBranch = 'E' | 'M' | 'O' | null;
type OcStatus = typeof ocCadets.$inferSelect['status'];

type ReconciliationField = {
  fieldName: string;
  sourceValue: unknown;
  targetValue: unknown;
};

export type CreateOcWithLifecycleInput = {
  name: string;
  ocNo: string;
  jnuEnrollmentNo?: string | null;
  uid?: string | null;
  courseId: string;
  branch?: OcBranch;
  platoonId?: string | null;
  arrivalAtUniversity: Date;
  actorUserId?: string | null;
  personal?: Partial<Omit<typeof ocPersonal.$inferInsert, 'ocId'>>;
};

export type SyncOcLifecycleOptions = {
  actorUserId?: string | null;
  reason?: string;
};

export type CreateOcWithLifecycleResult = {
  oc: {
    id: string;
    name: string;
    ocNo: string;
    jnuEnrollmentNo: string | null;
    uid: string;
    courseId: string;
    branch: OcBranch;
    platoonId: string | null;
    arrivalAtUniversity: Date;
    status: OcStatus;
    managerUserId: string | null;
    relegatedToCourseId: string | null;
    relegatedOn: Date | null;
    withdrawnOn: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  enrollment: typeof ocCourseEnrollments.$inferSelect;
};

function jsonValue(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return value ?? null;
}

function sameDbValue(a: unknown, b: unknown) {
  if (a instanceof Date || b instanceof Date) {
    const aTime = a instanceof Date ? a.getTime() : a ? new Date(String(a)).getTime() : null;
    const bTime = b instanceof Date ? b.getTime() : b ? new Date(String(b)).getTime() : null;
    return aTime === bTime;
  }
  return (a ?? null) === (b ?? null);
}

async function logReconciliationFields(
  tx: DbLike,
  ocId: string,
  input: {
    sourceTable: string;
    targetTable: string;
    conflictType: string;
    resolution: string;
    actorUserId?: string | null;
    fields: ReconciliationField[];
  },
) {
  const changed = input.fields.filter((field) => !sameDbValue(field.sourceValue, field.targetValue));
  if (!changed.length) return;

  await tx.insert(ocReconciliationAudit).values(
    changed.map((field) => ({
      ocId,
      sourceTable: input.sourceTable,
      targetTable: input.targetTable,
      conflictType: input.conflictType,
      fieldName: field.fieldName,
      sourceValue: jsonValue(field.sourceValue),
      targetValue: jsonValue(field.targetValue),
      resolution: input.resolution,
      actorUserId: input.actorUserId ?? null,
    })),
  );
}

function preCommissionSnapshotFromOc(oc: {
  id: string;
  courseId: string;
  branch: OcBranch;
  platoonId: string | null;
  relegatedToCourseId: string | null;
  relegatedOn: Date | null;
  withdrawnOn: Date | null;
}) {
  return {
    ocId: oc.id,
    courseId: oc.courseId,
    branch: oc.branch,
    platoonId: oc.platoonId,
    relegatedToCourseId: oc.relegatedToCourseId,
    relegatedOn: oc.relegatedOn,
    withdrawnOn: oc.withdrawnOn,
  };
}

async function getActiveEnrollment(ocId: string, tx: DbLike) {
  const [row] = await tx
    .select()
    .from(ocCourseEnrollments)
    .where(and(eq(ocCourseEnrollments.ocId, ocId), eq(ocCourseEnrollments.status, 'ACTIVE')))
    .limit(1);
  return row ?? null;
}

export async function createOcWithLifecycle(
  input: CreateOcWithLifecycleInput,
  tx?: DbLike,
): Promise<CreateOcWithLifecycleResult> {
  if (!tx) {
    return db.transaction((innerTx) => createOcWithLifecycle(input, innerTx));
  }

  const now = new Date();
  const uid = input.uid ?? `UID-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const ocValues: typeof ocCadets.$inferInsert = {
    name: input.name.trim(),
    ocNo: input.ocNo.trim(),
    jnuEnrollmentNo: input.jnuEnrollmentNo ?? null,
    uid,
    courseId: input.courseId,
    ...(input.branch != null ? { branch: input.branch } : {}),
    platoonId: input.platoonId ?? null,
    arrivalAtUniversity: input.arrivalAtUniversity,
  };

  const [oc] = await tx
    .insert(ocCadets)
    .values(ocValues)
    .returning({
      id: ocCadets.id,
      name: ocCadets.name,
      ocNo: ocCadets.ocNo,
      jnuEnrollmentNo: ocCadets.jnuEnrollmentNo,
      uid: ocCadets.uid,
      courseId: ocCadets.courseId,
      branch: ocCadets.branch,
      platoonId: ocCadets.platoonId,
      arrivalAtUniversity: ocCadets.arrivalAtUniversity,
      status: ocCadets.status,
      managerUserId: ocCadets.managerUserId,
      relegatedToCourseId: ocCadets.relegatedToCourseId,
      relegatedOn: ocCadets.relegatedOn,
      withdrawnOn: ocCadets.withdrawnOn,
      createdAt: ocCadets.createdAt,
      updatedAt: ocCadets.updatedAt,
    });

  const [enrollment] = await tx
    .insert(ocCourseEnrollments)
    .values({
      ocId: oc.id,
      courseId: oc.courseId,
      status: 'ACTIVE',
      origin: 'BASELINE',
      currentSemester: 1,
      startedOn: oc.createdAt ?? now,
      createdByUserId: input.actorUserId ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await tx.insert(ocPreCommission).values(preCommissionSnapshotFromOc(oc));

  if (input.personal && Object.keys(input.personal).length > 0) {
    await tx.insert(ocPersonal).values({
      ocId: oc.id,
      ...input.personal,
    });
  }

  return { oc, enrollment };
}

export async function syncOcLifecycleFromCadet(
  ocId: string,
  options: SyncOcLifecycleOptions = {},
  tx: DbLike = db,
) {
  const [oc] = await tx
    .select({
      id: ocCadets.id,
      courseId: ocCadets.courseId,
      branch: ocCadets.branch,
      platoonId: ocCadets.platoonId,
      relegatedToCourseId: ocCadets.relegatedToCourseId,
      relegatedOn: ocCadets.relegatedOn,
      withdrawnOn: ocCadets.withdrawnOn,
      createdAt: ocCadets.createdAt,
    })
    .from(ocCadets)
    .where(and(eq(ocCadets.id, ocId), isNull(ocCadets.deletedAt)))
    .limit(1);

  if (!oc) throw new ApiError(404, 'OC not found', 'not_found');

  const now = new Date();
  const resolution = options.reason ?? 'oc_cadets_canonical_sync';
  const activeEnrollment = await getActiveEnrollment(ocId, tx);

  if (!activeEnrollment) {
    await tx.insert(ocCourseEnrollments).values({
      ocId,
      courseId: oc.courseId,
      status: 'ACTIVE',
      origin: 'BASELINE',
      currentSemester: 1,
      startedOn: oc.createdAt ?? now,
      createdByUserId: options.actorUserId ?? null,
      createdAt: now,
      updatedAt: now,
    });
  } else if (!sameDbValue(oc.courseId, activeEnrollment.courseId)) {
    await logReconciliationFields(tx, ocId, {
      sourceTable: 'oc_cadets',
      targetTable: 'oc_course_enrollments',
      conflictType: 'ACTIVE_ENROLLMENT_COURSE_MISMATCH',
      resolution,
      actorUserId: options.actorUserId,
      fields: [{
        fieldName: 'course_id',
        sourceValue: oc.courseId,
        targetValue: activeEnrollment.courseId,
      }],
    });

    await tx
      .update(ocCourseEnrollments)
      .set({ courseId: oc.courseId, updatedAt: now })
      .where(eq(ocCourseEnrollments.id, activeEnrollment.id));
  }

  const [preCommission] = await tx
    .select()
    .from(ocPreCommission)
    .where(eq(ocPreCommission.ocId, ocId))
    .limit(1);

  const snapshot = preCommissionSnapshotFromOc(oc);
  if (!preCommission) {
    await tx.insert(ocPreCommission).values(snapshot);
    return;
  }

  await logReconciliationFields(tx, ocId, {
    sourceTable: 'oc_cadets',
    targetTable: 'oc_pre_commission',
    conflictType: 'PRE_COMMISSION_SNAPSHOT_MISMATCH',
    resolution,
    actorUserId: options.actorUserId,
    fields: [
      { fieldName: 'course_id', sourceValue: oc.courseId, targetValue: preCommission.courseId },
      { fieldName: 'branch', sourceValue: oc.branch, targetValue: preCommission.branch },
      { fieldName: 'platoon_id', sourceValue: oc.platoonId, targetValue: preCommission.platoonId },
      {
        fieldName: 'relegated_to_course_id',
        sourceValue: oc.relegatedToCourseId,
        targetValue: preCommission.relegatedToCourseId,
      },
      { fieldName: 'relegated_on', sourceValue: oc.relegatedOn, targetValue: preCommission.relegatedOn },
      { fieldName: 'withdrawn_on', sourceValue: oc.withdrawnOn, targetValue: preCommission.withdrawnOn },
    ],
  });

  await tx
    .update(ocPreCommission)
    .set({
      courseId: snapshot.courseId,
      branch: snapshot.branch,
      platoonId: snapshot.platoonId,
      relegatedToCourseId: snapshot.relegatedToCourseId,
      relegatedOn: snapshot.relegatedOn,
      withdrawnOn: snapshot.withdrawnOn,
    })
    .where(eq(ocPreCommission.ocId, ocId));
}
