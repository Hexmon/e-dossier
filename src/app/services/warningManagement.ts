import { and, eq, inArray, isNull } from 'drizzle-orm';
import { ApiError } from '@/app/lib/http';
import { db } from '@/app/db/client';
import { appointments } from '@/app/db/schema/auth/appointments';
import { positions } from '@/app/db/schema/auth/positions';
import { ocCadets, ocDiscipline, ocMedicalCategory } from '@/app/db/schema/training/oc';
import {
  warningManagementSettings,
  warningNotificationReads,
} from '@/app/db/schema/training/warningManagement';
import {
  canViewWarningCriterion,
  DISCIPLINE_RELEGATION_RESTRICTION_POINTS,
  MEDICAL_WARNING_MODULE_INTRO,
  MEDICAL_WARNING_TRIGGER_TYPE,
  mergeWarningCriteria,
  mergeMedicalWarningCriteria,
  normalizePositionKey,
  normalizeWarningPositionKey,
  parseMedicalAbsenceDays,
  warningPolicyKeyForCriterion,
  warningAppointmentPositionKey,
  warningNotificationActionSchema,
  warningSettingsUpdateSchema,
  WARNING_POSITION_LEVELS,
  WARNING_MODULE_INTRO,
  type MedicalWarningCriterion,
  type MedicalWarningTriggerType,
  type WarningModule,
  type WarningCriterion,
  type WarningTriggerType,
} from '@/app/lib/warning-management';

type AuthLike = {
  userId: string;
  claims?: {
    apt?: {
      id?: string;
      position?: string;
    };
  };
};

type WarningNotification = {
  id: string;
  title: string;
  message: string;
  ocId: string;
  ocNo: string | null;
  ocName: string;
  appointmentName: string;
  module: WarningModule;
  triggerType: WarningTriggerType | MedicalWarningTriggerType;
  restrictionPoints: number;
  actualPoints: number;
  absenceDays: number;
  actualAbsenceDays: number;
  semesterLabel: string;
  deepLink: string;
  relegationLink: string | null;
  isDisciplineRelegationEligible: boolean;
  canMarkForRelegation: boolean;
  readAt: string | null;
  createdAt: string;
};

type GeneratedWarningNotification = Omit<WarningNotification, 'readAt'> & {
  specificity: number;
};

function toCriterion(row: typeof warningManagementSettings.$inferSelect): WarningCriterion {
  return {
    criterionKey: row.criterionKey,
    module: row.module as WarningModule,
    positionKey: row.positionKey,
    positionName: row.positionName,
    triggerType: row.triggerType as WarningTriggerType,
    restrictionPoints: row.restrictionPoints,
    absenceDays: row.absenceDays,
    isEnabled: row.isEnabled,
  };
}

function toMedicalCriterion(row: typeof warningManagementSettings.$inferSelect): MedicalWarningCriterion {
  return {
    criterionKey: row.criterionKey,
    module: 'MEDICAL',
    positionKey: row.positionKey,
    positionName: row.positionName,
    triggerType: MEDICAL_WARNING_TRIGGER_TYPE,
    restrictionPoints: 0,
    absenceDays: row.absenceDays,
    isEnabled: row.isEnabled,
  };
}

function pickWarningNotification(
  current: GeneratedWarningNotification | undefined,
  next: GeneratedWarningNotification,
) {
  if (!current) return next;
  if (next.restrictionPoints !== current.restrictionPoints) {
    return next.restrictionPoints > current.restrictionPoints ? next : current;
  }
  if (next.specificity !== current.specificity) {
    return next.specificity > current.specificity ? next : current;
  }
  const nextExcess = next.actualPoints - next.restrictionPoints;
  const currentExcess = current.actualPoints - current.restrictionPoints;
  if (nextExcess !== currentExcess) return nextExcess > currentExcess ? next : current;
  return new Date(next.createdAt).getTime() > new Date(current.createdAt).getTime() ? next : current;
}

function stripGeneratedMeta(item: GeneratedWarningNotification): Omit<WarningNotification, 'readAt'> {
  return {
    id: item.id,
    title: item.title,
    message: item.message,
    ocId: item.ocId,
    ocNo: item.ocNo,
    ocName: item.ocName,
    appointmentName: item.appointmentName,
    module: item.module,
    triggerType: item.triggerType,
    restrictionPoints: item.restrictionPoints,
    actualPoints: item.actualPoints,
    absenceDays: item.absenceDays,
    actualAbsenceDays: item.actualAbsenceDays,
    semesterLabel: item.semesterLabel,
    deepLink: item.deepLink,
    relegationLink: item.relegationLink,
    isDisciplineRelegationEligible: item.isDisciplineRelegationEligible,
    canMarkForRelegation: item.canMarkForRelegation,
    createdAt: item.createdAt,
  };
}

export async function listWarningSettingsForAdmin() {
  const rows = await db.select().from(warningManagementSettings).orderBy(warningManagementSettings.positionName);
  const disciplineRows = rows.filter((row) => row.module === 'DISCIPLINE');
  const medicalRows = rows.filter((row) => row.module === 'MEDICAL');
  return {
    intro: WARNING_MODULE_INTRO,
    medicalIntro: MEDICAL_WARNING_MODULE_INTRO,
    criteria: mergeWarningCriteria(disciplineRows.map(toCriterion)),
    medicalCriteria: mergeMedicalWarningCriteria(medicalRows.map(toMedicalCriterion)),
  };
}

export async function updateWarningSettingsForAdmin(input: unknown, updatedBy: string) {
  const parsed = warningSettingsUpdateSchema.parse(input);
  const now = new Date();
  const rows = [...parsed.criteria, ...parsed.medicalCriteria].map((criterion) => ({
    ...criterion,
    positionKey: normalizeWarningPositionKey(criterion.positionKey),
    updatedBy,
    createdAt: now,
    updatedAt: now,
  }));

  for (const row of rows) {
    await db
      .insert(warningManagementSettings)
      .values(row)
      .onConflictDoUpdate({
        target: warningManagementSettings.criterionKey,
        set: {
          positionKey: row.positionKey,
          positionName: row.positionName,
          triggerType: row.triggerType,
          restrictionPoints: row.restrictionPoints,
          absenceDays: row.absenceDays,
          module: row.module,
          isEnabled: row.isEnabled,
          updatedBy,
          updatedAt: now,
        },
      });
  }

  return listWarningSettingsForAdmin();
}

async function getCurrentPositionKeys(auth: AuthLike) {
  const appointmentId = auth.claims?.apt?.id;
  const keys: string[] = [];
  if (appointmentId) {
    keys.push(warningAppointmentPositionKey(appointmentId));
    const [row] = await db
      .select({
        positionKey: positions.key,
        positionName: positions.displayName,
      })
      .from(appointments)
      .innerJoin(positions, eq(positions.id, appointments.positionId))
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    if (row) {
      keys.push(normalizePositionKey(`${row.positionKey ?? ''} ${row.positionName ?? ''}`));
    }
  }

  keys.push(normalizePositionKey(auth.claims?.apt?.position));
  return Array.from(new Set(keys.filter(Boolean)));
}

function pointsForRecord(row: {
  pointsDelta: number | null;
  pointsCumulative: number | null;
  numberOfPunishments: number | null;
}) {
  const delta = Math.abs(Number(row.pointsDelta ?? 0));
  if (Number.isFinite(delta) && delta > 0) return delta;
  const count = Number(row.numberOfPunishments ?? 0);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

function maxTwoTermWindow(termPoints: Map<number, number>) {
  const semesters = Array.from(termPoints.keys()).sort((a, b) => a - b);
  let best = { points: 0, label: '' };
  for (let index = 0; index < semesters.length; index += 1) {
    const current = semesters[index];
    const next = semesters.find((semester) => semester === current + 1);
    const points = (termPoints.get(current) ?? 0) + (next ? termPoints.get(next) ?? 0 : 0);
    if (points > best.points) {
      best = { points, label: next ? `Terms ${current}-${next}` : `Term ${current}` };
    }
  }
  return best;
}

function canCurrentAppointmentViewCriterion(
  criterion: Pick<WarningCriterion | MedicalWarningCriterion, 'positionKey' | 'positionName'>,
  appointmentKey: string,
  viewerPolicyKeys: string[],
) {
  const criterionPositionKey = normalizeWarningPositionKey(criterion.positionKey);
  if (appointmentKey && criterionPositionKey === appointmentKey) return true;

  const criterionPolicyKey = warningPolicyKeyForCriterion(criterion);
  const isAppointmentSpecific = criterionPositionKey.startsWith('appointment:');
  return viewerPolicyKeys.some((viewerPolicyKey) => {
    if (!canViewWarningCriterion(viewerPolicyKey, criterionPolicyKey)) return false;
    return !isAppointmentSpecific || WARNING_POSITION_LEVELS[criterionPolicyKey] > WARNING_POSITION_LEVELS[viewerPolicyKey];
  });
}

function isDisciplineRelegationWarning(criterion: WarningCriterion) {
  return (
    criterion.module === 'DISCIPLINE' &&
    criterion.triggerType === 'TWO_TERM_CUMULATIVE' &&
    criterion.restrictionPoints >= DISCIPLINE_RELEGATION_RESTRICTION_POINTS &&
    warningPolicyKeyForCriterion(criterion) === 'dc-ci-mceme'
  );
}

function getDisciplineRelegationLink(criterion: WarningCriterion, ocId: string, canMarkForRelegation: boolean) {
  return isDisciplineRelegationWarning(criterion) && canMarkForRelegation
    ? `/dashboard/genmgmt/promotion-relegation/relegation?ocId=${encodeURIComponent(ocId)}&source=discipline-warning`
    : null;
}

export async function listMyWarningNotifications(auth: AuthLike): Promise<WarningNotification[]> {
  const positionKeys = await getCurrentPositionKeys(auth);
  if (!positionKeys.length) return [];

  const settings = await listWarningSettingsForAdmin();
  const appointmentKey = auth.claims?.apt?.id ? warningAppointmentPositionKey(auth.claims.apt.id) : '';
  const viewerPolicyKeys = positionKeys.filter((key) => WARNING_POSITION_LEVELS[key] !== undefined);
  const criteria = settings.criteria.filter(
    (criterion) =>
      criterion.isEnabled && canCurrentAppointmentViewCriterion(criterion, appointmentKey, viewerPolicyKeys),
  );
  const medicalCriteria = settings.medicalCriteria.filter(
    (criterion) =>
      criterion.isEnabled && canCurrentAppointmentViewCriterion(criterion, appointmentKey, viewerPolicyKeys),
  );
  if (!criteria.length && !medicalCriteria.length) return [];

  const rows = criteria.length ? await db
    .select({
      ocId: ocCadets.id,
      ocNo: ocCadets.ocNo,
      ocName: ocCadets.name,
      semester: ocDiscipline.semester,
      dateOfOffence: ocDiscipline.dateOfOffence,
      numberOfPunishments: ocDiscipline.numberOfPunishments,
      pointsDelta: ocDiscipline.pointsDelta,
      pointsCumulative: ocDiscipline.pointsCumulative,
    })
    .from(ocDiscipline)
    .innerJoin(ocCadets, eq(ocCadets.id, ocDiscipline.ocId))
    .where(isNull(ocDiscipline.deletedAt)) : [];

  const byOc = new Map<string, {
    ocNo: string | null;
    ocName: string;
    latest: Date | null;
    termPoints: Map<number, number>;
  }>();

  for (const row of rows) {
    const entry = byOc.get(row.ocId) ?? {
      ocNo: row.ocNo,
      ocName: row.ocName,
      latest: null,
      termPoints: new Map<number, number>(),
    };
    const semester = Number(row.semester);
    entry.termPoints.set(semester, (entry.termPoints.get(semester) ?? 0) + pointsForRecord(row));
    const date = row.dateOfOffence instanceof Date ? row.dateOfOffence : new Date(row.dateOfOffence);
    if (!Number.isNaN(date.getTime()) && (!entry.latest || date > entry.latest)) entry.latest = date;
    byOc.set(row.ocId, entry);
  }

  const unreadByOc = new Map<string, GeneratedWarningNotification>();
  for (const [ocId, entry] of byOc) {
    for (const criterion of criteria) {
      const match =
        criterion.triggerType === 'TWO_TERM_CUMULATIVE'
          ? maxTwoTermWindow(entry.termPoints)
          : Array.from(entry.termPoints.entries()).reduce(
              (best, [semester, points]) =>
                points > best.points ? { points, label: `Term ${semester}` } : best,
              { points: 0, label: '' },
            );

      if (match.points < criterion.restrictionPoints) continue;
      const id = `${criterion.criterionKey}:${ocId}:${match.label.replace(/\s+/g, '-')}`;
      const eligibleForDisciplineRelegation = isDisciplineRelegationWarning(criterion);
      const canMarkForRelegation =
        eligibleForDisciplineRelegation && viewerPolicyKeys.includes('dc-ci-mceme');
      const generated: GeneratedWarningNotification = {
        id,
        title: 'Warning notification',
        message: `${entry.ocName}${entry.ocNo ? ` (${entry.ocNo})` : ''} got warning by ${criterion.positionName} for reaching the ${criterion.restrictionPoints}-restriction-point criteria. Current restriction points: ${match.points}.`,
        ocId,
        ocNo: entry.ocNo,
        ocName: entry.ocName,
        appointmentName: criterion.positionName,
        module: 'DISCIPLINE',
        triggerType: criterion.triggerType,
        restrictionPoints: criterion.restrictionPoints,
        actualPoints: match.points,
        absenceDays: 0,
        actualAbsenceDays: 0,
        semesterLabel: match.label,
        deepLink: `/dashboard/${ocId}/milmgmt/discip-records`,
        relegationLink: getDisciplineRelegationLink(criterion, ocId, canMarkForRelegation),
        isDisciplineRelegationEligible: eligibleForDisciplineRelegation,
        canMarkForRelegation,
        createdAt: (entry.latest ?? new Date(0)).toISOString(),
        specificity: normalizeWarningPositionKey(criterion.positionKey) === appointmentKey ? 2 : 1,
      };
      unreadByOc.set(ocId, pickWarningNotification(unreadByOc.get(ocId), generated));
    }
  }

  const medicalUnreadByOc = new Map<string, GeneratedWarningNotification>();
  if (medicalCriteria.length) {
    const medicalRows = await db
      .select({
        ocId: ocCadets.id,
        ocNo: ocCadets.ocNo,
        ocName: ocCadets.name,
        semester: ocMedicalCategory.semester,
        date: ocMedicalCategory.date,
        absence: ocMedicalCategory.absence,
      })
      .from(ocMedicalCategory)
      .innerJoin(ocCadets, eq(ocCadets.id, ocMedicalCategory.ocId))
      .where(isNull(ocMedicalCategory.deletedAt));

    const medicalByOc = new Map<string, {
      ocNo: string | null;
      ocName: string;
      latest: Date | null;
      absenceDays: number;
      semesterLabel: string;
    }>();

    for (const row of medicalRows) {
      const absenceDays = parseMedicalAbsenceDays(row.absence);
      if (absenceDays === null || absenceDays <= 0) continue;
      const current = medicalByOc.get(row.ocId);
      const date = row.date instanceof Date ? row.date : new Date(row.date);
      const latest = Number.isNaN(date.getTime()) ? current?.latest ?? null : date;
      if (current && current.absenceDays > absenceDays) {
        if (latest && (!current.latest || latest > current.latest)) current.latest = latest;
        continue;
      }
      medicalByOc.set(row.ocId, {
        ocNo: row.ocNo,
        ocName: row.ocName,
        latest,
        absenceDays,
        semesterLabel: `Term ${Number(row.semester)}`,
      });
    }

    for (const [ocId, entry] of medicalByOc) {
      for (const criterion of medicalCriteria) {
        if (entry.absenceDays < criterion.absenceDays) continue;
        const id = `${criterion.criterionKey}:${ocId}:${entry.semesterLabel.replace(/\s+/g, '-')}:${entry.absenceDays}-days`;
        const generated: GeneratedWarningNotification = {
          id,
          title: 'Medical warning notification',
          message: `${entry.ocName}${entry.ocNo ? ` (${entry.ocNo})` : ''} got medical warning by ${criterion.positionName} for reaching the ${criterion.absenceDays}-day absence criteria. Current medical absence: ${entry.absenceDays} day${entry.absenceDays === 1 ? '' : 's'}.`,
          ocId,
          ocNo: entry.ocNo,
          ocName: entry.ocName,
          appointmentName: criterion.positionName,
          module: 'MEDICAL',
          triggerType: MEDICAL_WARNING_TRIGGER_TYPE,
          restrictionPoints: 0,
          actualPoints: entry.absenceDays,
          absenceDays: criterion.absenceDays,
          actualAbsenceDays: entry.absenceDays,
          semesterLabel: entry.semesterLabel,
          deepLink: `/dashboard/${ocId}/milmgmt/med-record`,
          relegationLink: null,
          isDisciplineRelegationEligible: false,
          canMarkForRelegation: false,
          createdAt: (entry.latest ?? new Date(0)).toISOString(),
          specificity: normalizeWarningPositionKey(criterion.positionKey) === appointmentKey ? 2 : 1,
        };
        medicalUnreadByOc.set(ocId, pickWarningNotification(medicalUnreadByOc.get(ocId), generated));
      }
    }
  }

  const unread = [
    ...Array.from(unreadByOc.values()),
    ...Array.from(medicalUnreadByOc.values()),
  ].map(stripGeneratedMeta);

  if (!unread.length) return [];

  const readRows = await db
    .select({
      notificationKey: warningNotificationReads.notificationKey,
      readAt: warningNotificationReads.readAt,
    })
    .from(warningNotificationReads)
    .where(
      and(
        eq(warningNotificationReads.userId, auth.userId),
        inArray(warningNotificationReads.notificationKey, unread.map((item) => item.id)),
      ),
    );
  const readMap = new Map(readRows.map((row) => [row.notificationKey, row.readAt.toISOString()]));

  return unread
    .map((item) => ({ ...item, readAt: readMap.get(item.id) ?? null }))
    .sort((left, right) => {
      if (!left.readAt && right.readAt) return -1;
      if (left.readAt && !right.readAt) return 1;
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
}

export async function applyWarningNotificationAction(auth: AuthLike, input: unknown) {
  const action = warningNotificationActionSchema.parse(input);
  const notifications = await listMyWarningNotifications(auth);
  const keys =
    action.action === 'MARK_ALL_AS_READ'
      ? notifications.filter((item) => !item.readAt).map((item) => item.id)
      : [action.notificationId];

  if (action.action === 'MARK_AS_READ' && !notifications.some((item) => item.id === action.notificationId)) {
    throw new ApiError(404, 'Notification not found.', 'not_found');
  }

  if (keys.length) {
    const now = new Date();
    await db
      .insert(warningNotificationReads)
      .values(keys.map((notificationKey) => ({ userId: auth.userId, notificationKey, readAt: now, createdAt: now })))
      .onConflictDoNothing();
  }

  return listMyWarningNotifications(auth);
}
