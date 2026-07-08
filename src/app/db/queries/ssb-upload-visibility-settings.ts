import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/app/db/client";
import { appointments } from "@/app/db/schema/auth/appointments";
import { ssbUploadVisibilitySettings } from "@/app/db/schema/auth/ssbUploadVisibilitySettings";
import { positions } from "@/app/db/schema/auth/positions";
import { courses } from "@/app/db/schema/training/courses";
import { ocCadets, ocCourseEnrollments } from "@/app/db/schema/training/oc";
import {
  addIsoDays,
  isSsbUploadAdminViewer,
  parseSsbCourseDatesFromNotes,
  resolveSsbUploadVisibility,
  toIsoDateOnly,
} from "@/app/lib/ssb-upload-visibility";

export type SsbUploadVisibilitySettingRecord = {
  id: string;
  courseId: string;
  positionId: string;
  positionKey: string;
  positionName: string | null;
  hiddenDays: number;
  visibleUntil: string;
  createdAt: Date;
  updatedAt: Date;
};

const SETTINGS_SELECT = {
  id: ssbUploadVisibilitySettings.id,
  courseId: ssbUploadVisibilitySettings.courseId,
  positionId: ssbUploadVisibilitySettings.positionId,
  positionKey: positions.key,
  positionName: positions.displayName,
  hiddenDays: ssbUploadVisibilitySettings.hiddenDays,
  visibleUntil: ssbUploadVisibilitySettings.visibleUntil,
  createdAt: ssbUploadVisibilitySettings.createdAt,
  updatedAt: ssbUploadVisibilitySettings.updatedAt,
} as const;

export async function getSsbUploadCourseWindow(courseId: string) {
  const [course] = await db
    .select({ notes: courses.notes })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);

  const configuredWindow = parseSsbCourseDatesFromNotes(course?.notes);
  if (configuredWindow.courseStartDate && configuredWindow.courseEndDate) return configuredWindow;

  const [enrollmentWindow] = await db
    .select({
      startDate: sql<Date | null>`min(${ocCourseEnrollments.startedOn})`,
      endDate: sql<Date | null>`max(${ocCourseEnrollments.endedOn})`,
    })
    .from(ocCourseEnrollments)
    .where(eq(ocCourseEnrollments.courseId, courseId));

  let courseStartDate = toIsoDateOnly(enrollmentWindow?.startDate);
  const courseEndDate = toIsoDateOnly(enrollmentWindow?.endDate);

  if (!courseStartDate) {
    const [cadetWindow] = await db
      .select({ startDate: sql<Date | null>`min(${ocCadets.createdAt})` })
      .from(ocCadets)
      .where(eq(ocCadets.courseId, courseId));
    courseStartDate = toIsoDateOnly(cadetWindow?.startDate);
  }

  courseStartDate = configuredWindow.courseStartDate ?? courseStartDate;
  const resolvedCourseEndDate = configuredWindow.courseEndDate ?? courseEndDate;

  return {
    courseStartDate,
    courseEndDate: resolvedCourseEndDate,
    defaultVisibleUntil: addIsoDays(resolvedCourseEndDate, 1),
  };
}

export async function listSsbUploadVisibilitySettings(courseId: string) {
  const rows = await db
    .select(SETTINGS_SELECT)
    .from(ssbUploadVisibilitySettings)
    .innerJoin(positions, eq(positions.id, ssbUploadVisibilitySettings.positionId))
    .where(eq(ssbUploadVisibilitySettings.courseId, courseId))
    .orderBy(asc(positions.key));

  return rows as SsbUploadVisibilitySettingRecord[];
}

export async function saveSsbUploadVisibilitySettings(input: {
  courseId: string;
  settings: Array<{ positionId: string; hiddenDays: number; visibleUntil: string }>;
  actorUserId: string;
}) {
  const now = new Date();
  await db.transaction(async (tx) => {
    for (const setting of input.settings) {
      await tx
        .insert(ssbUploadVisibilitySettings)
        .values({
          courseId: input.courseId,
          positionId: setting.positionId,
          hiddenDays: setting.hiddenDays,
          visibleUntil: setting.visibleUntil,
          createdBy: input.actorUserId,
          updatedBy: input.actorUserId,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [ssbUploadVisibilitySettings.courseId, ssbUploadVisibilitySettings.positionId],
          set: {
            hiddenDays: setting.hiddenDays,
            visibleUntil: setting.visibleUntil,
            updatedBy: input.actorUserId,
            updatedAt: now,
          },
        });
    }
  });

  return listSsbUploadVisibilitySettings(input.courseId);
}

export async function getSsbUploadViewingDecisionForOc(input: {
  ocId: string;
  viewerAppointmentId?: string | null;
  viewerPositionKey?: string | null;
  viewerRoles?: string[] | null;
}) {
  const [oc] = await db
    .select({ courseId: ocCadets.courseId })
    .from(ocCadets)
    .where(eq(ocCadets.id, input.ocId))
    .limit(1);

  if (!oc?.courseId) {
    return resolveSsbUploadVisibility({
      courseWindow: { courseStartDate: null, courseEndDate: null, defaultVisibleUntil: null },
      setting: null,
      hasConfiguredSettings: true,
    });
  }

  const [courseWindow, settings] = await Promise.all([
    getSsbUploadCourseWindow(oc.courseId),
    listSsbUploadVisibilitySettings(oc.courseId),
  ]);

  const [viewerAppointment] = input.viewerAppointmentId
    ? await db
        .select({
          positionId: appointments.positionId,
          positionKey: positions.key,
        })
        .from(appointments)
        .innerJoin(positions, eq(positions.id, appointments.positionId))
        .where(
          and(
            eq(appointments.id, input.viewerAppointmentId),
            isNull(appointments.deletedAt),
            sql`${appointments.startsAt} <= now()`,
            sql`(${appointments.endsAt} IS NULL OR ${appointments.endsAt} > now())`
          )
        )
        .limit(1)
    : [];

  const resolvedPositionKey = viewerAppointment?.positionKey ?? input.viewerPositionKey;
  const positionKey = resolvedPositionKey?.trim().toLowerCase();
  const setting =
    (viewerAppointment?.positionId
      ? settings.find((row) => row.positionId === viewerAppointment.positionId)
      : null) ??
    (positionKey ? settings.find((row) => row.positionKey.trim().toLowerCase() === positionKey) ?? null : null);

  return resolveSsbUploadVisibility({
    courseWindow,
    setting,
    hasConfiguredSettings: settings.length > 0,
    viewerIsAdmin: isSsbUploadAdminViewer({ roles: input.viewerRoles, positionKey: resolvedPositionKey }),
  });
}
