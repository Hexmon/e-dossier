import { db } from '@/app/db/client';
import { getCourse } from '@/app/db/queries/courses';
import { getCourseOfferingForSubject } from '@/app/db/queries/courses';
import { listOCsBasic } from '@/app/db/queries/oc';
import {
  createWorkflowEventRow,
  createWorkflowNotificationsRows,
  createWorkflowTicketRow,
  getWorkflowSettingsRow,
  getWorkflowTicketRow,
  listActiveUsersByIds,
  listWorkflowActorUsersByIds,
  listWorkflowEventsByTicketId,
  listWorkflowNotificationsForUser,
  listWorkflowSettingsRows,
  markAllWorkflowNotificationsRead,
  markWorkflowNotificationRead,
  updateWorkflowTicketRow,
  upsertWorkflowSettingsRow,
} from '@/app/db/queries/marksReviewWorkflow';
import {
  deleteOcPtMotivationValuesBySemester,
  deleteOcPtScoresBySemester,
  listMotivationFieldsByIds,
  listOcPtMotivationValuesByOcIds,
  listOcPtScoresByOcIds,
  listTemplateScoresByIds,
  upsertOcPtMotivationValues,
  upsertOcPtScores,
} from '@/app/db/queries/physicalTrainingOc';
import { getPtTemplateBySemester } from '@/app/db/queries/physicalTraining';
import {
  buildAcademicsPublishItems,
  buildAcademicsWorkflowKey,
  buildPtPublishItems,
  buildPtWorkflowKey,
  buildWorkflowDeepLink,
  buildWorkflowSelectionLabel,
  type AcademicWorkflowDraftPayload,
  type MarksWorkflowEventType,
  type MarksWorkflowModule,
  type MarksWorkflowSettingsInput,
  type MarksWorkflowSettingsUpdateInput,
  type MarksWorkflowStatus,
  marksWorkflowSettingsUpdateSchema,
  type MarksWorkflowTicketActionInput,
  type PtWorkflowDraftPayload,
  resolveWorkflowActorContext,
  getAllowedWorkflowActions,
  validateWorkflowUserAssignments,
  isMarksWorkflowModuleActive,
  ensureWorkflowActionAllowed,
  assertWorkflowRevision,
  ensureVerifierDraftMessage,
  ensureWorkflowMessageRequired,
  academicWorkflowDraftPayloadSchema,
  ptWorkflowDraftPayloadSchema,
  isWorkflowAssignedUser,
  workflowNotificationActionSchema,
  type WorkflowNotificationActionInput,
} from '@/app/lib/marks-review-workflow';
import { ApiError } from '@/app/lib/http';
import { getOcAcademicSemester, updateOcAcademicSubject } from '@/app/services/oc-academics';

type ActorContext = {
  userId: string;
  roles: string[];
};

type WorkflowSettingsResponse = {
  module: MarksWorkflowModule;
  dataEntryUserIds: string[];
  verificationUserIds: string[];
  postVerificationOverrideMode: 'SUPER_ADMIN_ONLY' | 'ADMIN_AND_SUPER_ADMIN';
  isActive: boolean;
  dataEntryUsers: Array<{ id: string; name: string; rank: string; username: string }>;
  verificationUsers: Array<{ id: string; name: string; rank: string; username: string }>;
};

type WorkflowSettingsRow = Awaited<ReturnType<typeof listWorkflowSettingsRows>>[number];
type WorkflowEventRow = Awaited<ReturnType<typeof listWorkflowEventsByTicketId>>[number];
type WorkflowActorUserRow = Awaited<ReturnType<typeof listWorkflowActorUsersByIds>>[number];
type WorkflowNotificationRow = Awaited<ReturnType<typeof listWorkflowNotificationsForUser>>[number];

function getAcademicSubjectLabel(
  payload: AcademicWorkflowDraftPayload | PtWorkflowDraftPayload,
): string | null {
  return 'subject' in payload ? payload.subject.name : null;
}

function normalizeSettingsRow(
  row: Awaited<ReturnType<typeof getWorkflowSettingsRow>>,
): MarksWorkflowSettingsInput {
  return {
    dataEntryUserIds: row?.dataEntryUserIds ?? [],
    verificationUserIds: row?.verificationUserIds ?? [],
    postVerificationOverrideMode: row?.postVerificationOverrideMode ?? 'SUPER_ADMIN_ONLY',
  };
}

async function resolveSettingsResponse(
  module: MarksWorkflowModule,
  settings: MarksWorkflowSettingsInput,
): Promise<WorkflowSettingsResponse> {
  const [dataEntryUsers, verificationUsers] = await Promise.all([
    listWorkflowActorUsersByIds(settings.dataEntryUserIds),
    listWorkflowActorUsersByIds(settings.verificationUserIds),
  ]);

  return {
    module,
    dataEntryUserIds: settings.dataEntryUserIds,
    verificationUserIds: settings.verificationUserIds,
    postVerificationOverrideMode: settings.postVerificationOverrideMode,
    isActive: isMarksWorkflowModuleActive(settings),
    dataEntryUsers,
    verificationUsers,
  };
}

async function assertWorkflowUsersExist(userIds: string[]) {
  if (!userIds.length) return;
  const rows = await listActiveUsersByIds(userIds);
  const validIds = new Set(
    rows
      // Workflow assignment should allow any existing non-deleted account.
      // `isActive` is not a reliable access signal in current deployments.
      .filter((row: Awaited<ReturnType<typeof listActiveUsersByIds>>[number]) => !row.deletedAt)
      .map((row: Awaited<ReturnType<typeof listActiveUsersByIds>>[number]) => row.id),
  );
  const invalidIds = userIds.filter((userId) => !validIds.has(userId));
  if (invalidIds.length > 0) {
    throw new ApiError(400, 'One or more selected workflow users are invalid or deleted.', 'invalid_workflow_user', {
      invalidIds,
    });
  }
}

function ensureWorkflowAccess(settings: MarksWorkflowSettingsInput, actor: ActorContext) {
  if (!isMarksWorkflowModuleActive(settings)) return;
  const flags = resolveWorkflowActorContext({
    settings,
    userId: actor.userId,
    roles: actor.roles,
  });
  if (!flags.isAdmin && !flags.isDataEntryUser && !flags.isVerificationUser && !flags.canOverrideVerified) {
    throw new ApiError(403, 'You are not assigned to this workflow.', 'forbidden');
  }
}

function ensurePtScoreRefValid(
  row:
    | {
        semester: number;
        typeDeletedAt: Date | null;
        taskDeletedAt: Date | null;
        attemptDeletedAt: Date | null;
        gradeDeletedAt: Date | null;
        typeIsActive: boolean;
        attemptIsActive: boolean;
        gradeIsActive: boolean;
      }
    | undefined,
  semester: number,
) {
  if (!row) return false;
  if (row.semester !== semester) return false;
  if (row.typeDeletedAt || row.taskDeletedAt || row.attemptDeletedAt || row.gradeDeletedAt) return false;
  if (!row.typeIsActive || !row.attemptIsActive || !row.gradeIsActive) return false;
  return true;
}

function ensurePtMotivationFieldValid(
  row:
    | {
        semester: number;
        isActive: boolean;
        deletedAt: Date | null;
      }
    | undefined,
  semester: number,
) {
  if (!row) return false;
  if (row.semester !== semester) return false;
  if (row.deletedAt || !row.isActive) return false;
  return true;
}

async function buildAcademicsLiveDraftPayload(args: {
  courseId: string;
  semester: number;
  subjectId: string;
}): Promise<{ courseLabel: string; selectionLabel: string; payload: AcademicWorkflowDraftPayload }> {
  const [course, offering] = await Promise.all([
    getCourse(args.courseId),
    getCourseOfferingForSubject(args.courseId, args.semester, args.subjectId),
  ]);

  if (!course) {
    throw new ApiError(404, 'Course not found.', 'not_found', { courseId: args.courseId });
  }
  if (!offering) {
    throw new ApiError(404, 'Subject offering not found for course and semester.', 'not_found', {
      courseId: args.courseId,
      semester: args.semester,
      subjectId: args.subjectId,
    });
  }

  let ocRows = await listOCsBasic({
    courseId: args.courseId,
    active: false,
    limit: 5000,
    sort: 'name_asc',
  });

  const subjectBranch = offering.subject.branch?.trim();
  if (subjectBranch && subjectBranch !== 'C') {
    ocRows = ocRows.filter((row) => row.branch === subjectBranch);
  }

  const semesterViews = await Promise.all(
    ocRows.map(async (oc) => {
      try {
        return await getOcAcademicSemester(oc.id, args.semester);
      } catch {
        return null;
      }
    }),
  );

  const payload: AcademicWorkflowDraftPayload = {
    courseId: args.courseId,
    semester: args.semester,
    subjectId: args.subjectId,
    subject: {
      id: offering.subject.id,
      code: offering.subject.code,
      name: offering.subject.name,
      branch: offering.subject.branch ?? null,
      hasTheory: Boolean(offering.subject.hasTheory),
      hasPractical: Boolean(offering.subject.hasPractical),
      defaultTheoryCredits: offering.subject.defaultTheoryCredits ?? null,
      defaultPracticalCredits: offering.subject.defaultPracticalCredits ?? null,
    },
    items: ocRows.map((oc, index) => {
      const semesterView = semesterViews[index];
      const record = semesterView?.subjects.find((subject) => subject.subject.id === args.subjectId);

      return {
        ocId: oc.id,
        ocNo: oc.ocNo,
        name: oc.name,
        branch: oc.branch,
        theory: record?.theory ?? undefined,
        practical: record?.practical ?? undefined,
      };
    }),
  };

  const courseLabel = `${course.code} - ${course.title}`;
  const selectionLabel = buildWorkflowSelectionLabel({
    module: 'ACADEMICS_BULK',
    courseLabel,
    semester: args.semester,
    subjectLabel: `${offering.subject.code} - ${offering.subject.name}`,
  });

  return { courseLabel, selectionLabel, payload };
}

async function buildPtLiveDraftPayload(args: {
  courseId: string;
  semester: number;
}): Promise<{ courseLabel: string; selectionLabel: string; payload: PtWorkflowDraftPayload }> {
  const course = await getCourse(args.courseId);
  if (!course) {
    throw new ApiError(404, 'Course not found.', 'not_found', { courseId: args.courseId });
  }

  const [template, ocRows] = await Promise.all([
    getPtTemplateBySemester(args.semester, { includeDeleted: false }),
    listOCsBasic({
      courseId: args.courseId,
      active: false,
      limit: 5000,
      sort: 'name_asc',
    }),
  ]);

  const ocIds = ocRows.map((row) => row.id);
  const [scoreRows, motivationRows] = await Promise.all([
    listOcPtScoresByOcIds(ocIds, args.semester),
    listOcPtMotivationValuesByOcIds(ocIds, args.semester),
  ]);

  const scoresByOc = scoreRows.reduce<Record<string, typeof scoreRows>>((acc, row) => {
    acc[row.ocId] = acc[row.ocId] ?? [];
    acc[row.ocId].push(row);
    return acc;
  }, {});

  const motivationByOc = motivationRows.reduce<Record<string, typeof motivationRows>>((acc, row) => {
    acc[row.ocId] = acc[row.ocId] ?? [];
    acc[row.ocId].push(row);
    return acc;
  }, {});

  const payload: PtWorkflowDraftPayload = {
    courseId: args.courseId,
    semester: args.semester,
    template,
    items: ocRows.map((oc) => ({
      oc: {
        id: oc.id,
        ocNo: oc.ocNo,
        name: oc.name,
        branch: oc.branch,
        platoonId: oc.platoonId,
        platoonKey: oc.platoonKey,
        platoonName: oc.platoonName,
        withdrawnOn: oc.withdrawnOn ? oc.withdrawnOn.toISOString() : null,
      },
      scores: (scoresByOc[oc.id] ?? []).map((row) => ({
        ptTaskScoreId: row.ptTaskScoreId,
        marksScored: row.marksScored,
        remark: row.remark,
      })),
      motivationValues: (motivationByOc[oc.id] ?? []).map((row) => ({
        fieldId: row.fieldId,
        value: row.value,
      })),
    })),
  };

  const courseLabel = `${course.code} - ${course.title}`;
  const selectionLabel = buildWorkflowSelectionLabel({
    module: 'PT_BULK',
    courseLabel,
    semester: args.semester,
  });

  return { courseLabel, selectionLabel, payload };
}

async function validateAcademicsDraftPayload(
  args: { courseId: string; semester: number; subjectId: string },
  payload: AcademicWorkflowDraftPayload,
) {
  const parsed = academicWorkflowDraftPayloadSchema.parse(payload);
  if (parsed.courseId !== args.courseId || parsed.semester !== args.semester || parsed.subjectId !== args.subjectId) {
    throw new ApiError(400, 'Draft payload does not match the requested workflow selection.', 'invalid_workflow_payload');
  }

  const offering = await getCourseOfferingForSubject(args.courseId, args.semester, args.subjectId);
  if (!offering) {
    throw new ApiError(404, 'Subject offering not found for course and semester.', 'not_found');
  }

  const validOcIds = new Set(
    (await listOCsBasic({ courseId: args.courseId, active: false, limit: 5000 })).map((row) => row.id),
  );
  const invalidOcIds = parsed.items.map((item) => item.ocId).filter((ocId) => !validOcIds.has(ocId));
  if (invalidOcIds.length > 0) {
    throw new ApiError(400, 'Draft contains invalid OCs for this course.', 'invalid_oc', { invalidOcIds });
  }

  return parsed;
}

async function validatePtDraftPayload(args: { courseId: string; semester: number }, payload: PtWorkflowDraftPayload) {
  const parsed = ptWorkflowDraftPayloadSchema.parse(payload);
  if (parsed.courseId !== args.courseId || parsed.semester !== args.semester) {
    throw new ApiError(400, 'Draft payload does not match the requested workflow selection.', 'invalid_workflow_payload');
  }

  const validOcIds = new Set(
    (await listOCsBasic({ courseId: args.courseId, active: false, limit: 5000 })).map((row) => row.id),
  );
  const invalidOcIds = parsed.items.map((item) => item.oc.id).filter((ocId) => !validOcIds.has(ocId));
  if (invalidOcIds.length > 0) {
    throw new ApiError(400, 'Draft contains invalid OCs for this course.', 'invalid_oc', { invalidOcIds });
  }

  const scoreIds = Array.from(
    new Set(parsed.items.flatMap((item) => item.scores.map((score) => score.ptTaskScoreId))),
  );
  const fieldIds = Array.from(
    new Set(parsed.items.flatMap((item) => item.motivationValues.map((entry) => entry.fieldId))),
  );

  const [scoreRows, fieldRows] = await Promise.all([
    listTemplateScoresByIds(scoreIds),
    listMotivationFieldsByIds(fieldIds),
  ]);

  const scoreById = new Map(scoreRows.map((row) => [row.ptTaskScoreId, row]));
  const fieldById = new Map(fieldRows.map((row) => [row.id, row]));

  for (const item of parsed.items) {
    for (const score of item.scores) {
      const row = scoreById.get(score.ptTaskScoreId);
      if (!ensurePtScoreRefValid(row, args.semester)) {
        throw new ApiError(400, 'Draft contains invalid PT score references.', 'invalid_score', {
          ocId: item.oc.id,
          ptTaskScoreId: score.ptTaskScoreId,
        });
      }
      if (row && score.marksScored > row.maxMarks) {
        throw new ApiError(400, 'Draft contains marks above the template max marks.', 'marks_exceed_max', {
          ocId: item.oc.id,
          ptTaskScoreId: score.ptTaskScoreId,
          maxMarks: row.maxMarks,
          marksScored: score.marksScored,
        });
      }
    }

    for (const entry of item.motivationValues) {
      const row = fieldById.get(entry.fieldId);
      if (!ensurePtMotivationFieldValid(row, args.semester)) {
        throw new ApiError(400, 'Draft contains invalid PT motivation fields.', 'invalid_field', {
          ocId: item.oc.id,
          fieldId: entry.fieldId,
        });
      }
    }
  }

  return parsed;
}

async function decorateWorkflowActivityLog(ticketId: string) {
  const events = await listWorkflowEventsByTicketId(ticketId);
  const actorIds = Array.from(
    new Set(events.map((event: WorkflowEventRow) => event.actorUserId).filter(Boolean) as string[]),
  );
  const actorRows = await listWorkflowActorUsersByIds(actorIds);
  const actorById = new Map<string, WorkflowActorUserRow>(
    actorRows.map((row: WorkflowActorUserRow) => [row.id, row]),
  );

  return events.map((event: WorkflowEventRow) => ({
    id: event.id,
    eventType: event.eventType,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    message: event.message,
    createdAt: event.createdAt,
    actor: event.actorUserId
      ? {
          id: event.actorUserId,
          name: actorById.get(event.actorUserId)?.name ?? 'Unknown User',
          rank: actorById.get(event.actorUserId)?.rank ?? '',
          username: actorById.get(event.actorUserId)?.username ?? '',
        }
      : null,
  }));
}

async function buildSettingsMap() {
  const rows = await listWorkflowSettingsRows();
  const map = new Map<MarksWorkflowModule, WorkflowSettingsResponse>();
  for (const module of ['ACADEMICS_BULK', 'PT_BULK'] as const) {
    const row = rows.find((entry: WorkflowSettingsRow) => entry.module === module) ?? null;
    map.set(module, await resolveSettingsResponse(module, normalizeSettingsRow(row)));
  }
  return map;
}

async function addWorkflowNotifications(args: {
  ticketId: string;
  module: MarksWorkflowModule;
  workflowStatus: MarksWorkflowStatus;
  recipients: string[];
  actorUserId: string;
  selectionLabel: string;
  deepLink: string;
  message?: string | null;
}) {
  const recipientIds = Array.from(new Set(args.recipients.filter((userId) => userId !== args.actorUserId)));
  if (!recipientIds.length) return [];

  const now = new Date();
  return createWorkflowNotificationsRows(
    recipientIds.map((userId) => ({
      userId,
      ticketId: args.ticketId,
      module: args.module,
      actorUserId: args.actorUserId,
      workflowStatus: args.workflowStatus,
      selectionLabel: args.selectionLabel,
      message: args.message ?? null,
      deepLink: args.deepLink,
      createdAt: now,
      updatedAt: now,
    })),
  );
}

async function publishAcademicsDraft(payload: AcademicWorkflowDraftPayload, actor: ActorContext) {
  const publishItems = buildAcademicsPublishItems(payload);
  for (const item of publishItems) {
    await updateOcAcademicSubject(
      item.ocId,
      item.semester,
      item.subjectId,
      {
        theory: item.theory,
        practical: item.practical,
      },
      {
        actorUserId: actor.userId,
        actorRoles: actor.roles,
      },
    );
  }
}

async function publishPtDraft(payload: PtWorkflowDraftPayload) {
  const publishItems = buildPtPublishItems(payload);
  for (const item of publishItems) {
    await deleteOcPtScoresBySemester(item.ocId, item.semester);
    await deleteOcPtMotivationValuesBySemester(item.ocId, item.semester);
    if (item.scores.length > 0) {
      await upsertOcPtScores(item.ocId, item.semester, item.scores);
    }
    if (item.motivationValues.length > 0) {
      await upsertOcPtMotivationValues(item.ocId, item.semester, item.motivationValues);
    }
  }
}

async function buildWorkflowRouteState(args: {
  module: MarksWorkflowModule;
  workflowKey: string;
  actor: ActorContext;
  settings: WorkflowSettingsResponse;
  draftPayloadFactory: () => Promise<{
    courseLabel: string;
    selectionLabel: string;
    payload: AcademicWorkflowDraftPayload | PtWorkflowDraftPayload;
  }>;
}) {
  const liveState = await args.draftPayloadFactory();
  const ticket = args.settings.isActive ? await getWorkflowTicketRow(args.module, args.workflowKey) : null;
  const actorFlags = resolveWorkflowActorContext({
    settings: args.settings,
    userId: args.actor.userId,
    roles: args.actor.roles,
  });

  if (args.settings.isActive) {
    ensureWorkflowAccess(args.settings, args.actor);
  }

  const effectiveStatus = (ticket?.status ?? 'DRAFT') as MarksWorkflowStatus;
  const allowedActions = getAllowedWorkflowActions({
    isActive: args.settings.isActive,
    status: effectiveStatus,
    actor: actorFlags,
  });

  return {
    settings: args.settings,
    ticket: ticket
      ? {
          id: ticket.id,
          status: ticket.status,
          currentRevision: ticket.currentRevision,
          draftUpdatedAt: ticket.draftUpdatedAt,
          submittedAt: ticket.submittedAt,
          verifiedAt: ticket.verifiedAt,
          lastActorUserId: ticket.lastActorUserId,
          lastActorMessage: ticket.lastActorMessage,
        }
      : {
          id: null,
          status: effectiveStatus,
          currentRevision: null,
          draftUpdatedAt: null,
          submittedAt: null,
          verifiedAt: null,
          lastActorUserId: null,
          lastActorMessage: null,
        },
    currentRevision: ticket?.currentRevision ?? null,
    allowedActions,
    liveSnapshot: liveState.payload,
    draftPayload: (ticket?.draftPayload as AcademicWorkflowDraftPayload | PtWorkflowDraftPayload | undefined) ?? liveState.payload,
    activityLog: ticket ? await decorateWorkflowActivityLog(ticket.id) : [],
    selectionLabel: ticket?.selectionLabel ?? liveState.selectionLabel,
    courseLabel: ticket?.courseLabel ?? liveState.courseLabel,
  };
}

async function mutateWorkflowTicket(args: {
  module: MarksWorkflowModule;
  workflowKey: string;
  actor: ActorContext;
  settings: WorkflowSettingsResponse;
  action: MarksWorkflowTicketActionInput;
  livePayloadFactory: () => Promise<{
    courseLabel: string;
    selectionLabel: string;
    payload: AcademicWorkflowDraftPayload | PtWorkflowDraftPayload;
  }>;
  validatePayload: (
    payload: AcademicWorkflowDraftPayload | PtWorkflowDraftPayload,
  ) => Promise<AcademicWorkflowDraftPayload | PtWorkflowDraftPayload>;
  publishPayload: (
    payload: AcademicWorkflowDraftPayload | PtWorkflowDraftPayload,
    actor: ActorContext,
  ) => Promise<void>;
  deepLinkFactory: () => string;
  subjectId?: string | null;
}) {
  if (!args.settings.isActive) {
    throw new ApiError(409, 'Workflow is not configured for this module.', 'workflow_inactive');
  }

  const actorFlags = resolveWorkflowActorContext({
    settings: args.settings,
    userId: args.actor.userId,
    roles: args.actor.roles,
  });
  ensureWorkflowAccess(args.settings, args.actor);

  const existingTicket = await getWorkflowTicketRow(args.module, args.workflowKey);
  const effectiveStatus = (existingTicket?.status ?? 'DRAFT') as MarksWorkflowStatus;
  const allowedActions = getAllowedWorkflowActions({
    isActive: args.settings.isActive,
    status: effectiveStatus,
    actor: actorFlags,
  });
  ensureWorkflowActionAllowed(args.action.action, allowedActions);
  ensureWorkflowMessageRequired(args.action.action, 'message' in args.action ? args.action.message : undefined);

  if (existingTicket) {
    assertWorkflowRevision(existingTicket.currentRevision, args.action.revision ?? null);
  } else if (args.action.action !== 'SAVE_DRAFT') {
    throw new ApiError(400, 'Save a draft before moving this workflow ticket.', 'workflow_ticket_missing');
  }

  const liveState = await args.livePayloadFactory();
  const now = new Date();
  const deepLink = args.deepLinkFactory();

  if (args.action.action === 'SAVE_DRAFT') {
    if (effectiveStatus === 'PENDING_VERIFICATION') {
      ensureVerifierDraftMessage(actorFlags, effectiveStatus, args.action.message);
    }

    const validatedPayload = await args.validatePayload(args.action.payload);
    if (!existingTicket) {
      const created = await createWorkflowTicketRow({
        module: args.module,
        workflowKey: args.workflowKey,
        courseId: validatedPayload.courseId,
        semester: validatedPayload.semester,
        subjectId: args.subjectId ?? null,
        subjectLabel: getAcademicSubjectLabel(validatedPayload),
        courseLabel: liveState.courseLabel,
        selectionLabel: liveState.selectionLabel,
        status: effectiveStatus,
        draftPayload: validatedPayload,
        currentRevision: 1,
        lastActorUserId: args.actor.userId,
        lastActorMessage: args.action.message?.trim() || null,
        draftUpdatedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      await createWorkflowEventRow({
        ticketId: created.id,
        eventType: 'SAVE_DRAFT',
        actorUserId: args.actor.userId,
        fromStatus: null,
        toStatus: effectiveStatus,
        message: args.action.message?.trim() || null,
        payload: { revision: 1 },
        createdAt: now,
      });

      return buildWorkflowRouteState({
        module: args.module,
        workflowKey: args.workflowKey,
        actor: args.actor,
        settings: args.settings,
        draftPayloadFactory: args.livePayloadFactory,
      });
    }

    await updateWorkflowTicketRow(existingTicket.id, {
      draftPayload: validatedPayload,
      currentRevision: existingTicket.currentRevision + 1,
      lastActorUserId: args.actor.userId,
      lastActorMessage: args.action.message?.trim() || null,
      draftUpdatedAt: now,
      updatedAt: now,
      selectionLabel: liveState.selectionLabel,
      courseLabel: liveState.courseLabel,
      subjectLabel: getAcademicSubjectLabel(validatedPayload),
    });

    await createWorkflowEventRow({
      ticketId: existingTicket.id,
      eventType: 'SAVE_DRAFT',
      actorUserId: args.actor.userId,
      fromStatus: existingTicket.status,
      toStatus: existingTicket.status,
      message: args.action.message?.trim() || null,
      payload: { revision: existingTicket.currentRevision + 1 },
      createdAt: now,
    });

    return buildWorkflowRouteState({
      module: args.module,
      workflowKey: args.workflowKey,
      actor: args.actor,
      settings: args.settings,
      draftPayloadFactory: args.livePayloadFactory,
    });
  }

  if (!existingTicket) {
    throw new ApiError(400, 'Workflow ticket not found.', 'workflow_ticket_missing');
  }

  if (args.action.action === 'SUBMIT_FOR_VERIFICATION') {
    await updateWorkflowTicketRow(existingTicket.id, {
      status: 'PENDING_VERIFICATION',
      currentRevision: existingTicket.currentRevision + 1,
      submittedByUserId: args.actor.userId,
      submittedAt: now,
      lastActorUserId: args.actor.userId,
      lastActorMessage: null,
      updatedAt: now,
      draftUpdatedAt: now,
    });

    await createWorkflowEventRow({
      ticketId: existingTicket.id,
      eventType: 'SUBMIT_FOR_VERIFICATION',
      actorUserId: args.actor.userId,
      fromStatus: existingTicket.status,
      toStatus: 'PENDING_VERIFICATION',
      message: null,
      payload: { revision: existingTicket.currentRevision + 1 },
      createdAt: now,
    });

    await addWorkflowNotifications({
      ticketId: existingTicket.id,
      module: args.module,
      workflowStatus: 'PENDING_VERIFICATION',
      recipients: args.settings.verificationUserIds,
      actorUserId: args.actor.userId,
      selectionLabel: existingTicket.selectionLabel ?? liveState.selectionLabel,
      deepLink,
      message: 'Submitted for verification.',
    });
  }

  if (args.action.action === 'REQUEST_CHANGES') {
    await updateWorkflowTicketRow(existingTicket.id, {
      status: 'CHANGES_REQUESTED',
      currentRevision: existingTicket.currentRevision + 1,
      lastActorUserId: args.actor.userId,
      lastActorMessage: args.action.message.trim(),
      updatedAt: now,
      draftUpdatedAt: now,
    });

    await createWorkflowEventRow({
      ticketId: existingTicket.id,
      eventType: 'REQUEST_CHANGES',
      actorUserId: args.actor.userId,
      fromStatus: existingTicket.status,
      toStatus: 'CHANGES_REQUESTED',
      message: args.action.message.trim(),
      payload: { revision: existingTicket.currentRevision + 1 },
      createdAt: now,
    });

    await addWorkflowNotifications({
      ticketId: existingTicket.id,
      module: args.module,
      workflowStatus: 'CHANGES_REQUESTED',
      recipients: args.settings.dataEntryUserIds,
      actorUserId: args.actor.userId,
      selectionLabel: existingTicket.selectionLabel ?? liveState.selectionLabel,
      deepLink,
      message: args.action.message.trim(),
    });
  }

  if (args.action.action === 'VERIFY_AND_PUBLISH') {
    await args.publishPayload(existingTicket.draftPayload as AcademicWorkflowDraftPayload | PtWorkflowDraftPayload, args.actor);

    await updateWorkflowTicketRow(existingTicket.id, {
      status: 'VERIFIED',
      currentRevision: existingTicket.currentRevision + 1,
      verifiedByUserId: args.actor.userId,
      verifiedAt: now,
      lastActorUserId: args.actor.userId,
      lastActorMessage: args.action.message?.trim() || null,
      updatedAt: now,
      draftUpdatedAt: now,
    });

    await createWorkflowEventRow({
      ticketId: existingTicket.id,
      eventType: 'VERIFY_AND_PUBLISH',
      actorUserId: args.actor.userId,
      fromStatus: existingTicket.status,
      toStatus: 'VERIFIED',
      message: args.action.message?.trim() || null,
      payload: { revision: existingTicket.currentRevision + 1 },
      createdAt: now,
    });

    await addWorkflowNotifications({
      ticketId: existingTicket.id,
      module: args.module,
      workflowStatus: 'VERIFIED',
      recipients: args.settings.dataEntryUserIds,
      actorUserId: args.actor.userId,
      selectionLabel: existingTicket.selectionLabel ?? liveState.selectionLabel,
      deepLink,
      message: 'Verification completed.',
    });
  }

  if (args.action.action === 'OVERRIDE_PUBLISH') {
    const validatedPayload = await args.validatePayload(args.action.payload);
    await args.publishPayload(validatedPayload, args.actor);

    await updateWorkflowTicketRow(existingTicket.id, {
      status: 'VERIFIED',
      draftPayload: validatedPayload,
      currentRevision: existingTicket.currentRevision + 1,
      verifiedByUserId: args.actor.userId,
      verifiedAt: now,
      lastActorUserId: args.actor.userId,
      lastActorMessage: args.action.message.trim(),
      updatedAt: now,
      draftUpdatedAt: now,
      selectionLabel: liveState.selectionLabel,
      courseLabel: liveState.courseLabel,
      subjectLabel: getAcademicSubjectLabel(validatedPayload),
    });

    await createWorkflowEventRow({
      ticketId: existingTicket.id,
      eventType: 'OVERRIDE_PUBLISH',
      actorUserId: args.actor.userId,
      fromStatus: existingTicket.status,
      toStatus: 'VERIFIED',
      message: args.action.message.trim(),
      payload: { revision: existingTicket.currentRevision + 1 },
      createdAt: now,
    });

    await addWorkflowNotifications({
      ticketId: existingTicket.id,
      module: args.module,
      workflowStatus: 'VERIFIED',
      recipients: [...args.settings.dataEntryUserIds, ...args.settings.verificationUserIds],
      actorUserId: args.actor.userId,
      selectionLabel: existingTicket.selectionLabel ?? liveState.selectionLabel,
      deepLink,
      message: args.action.message.trim(),
    });
  }

  return buildWorkflowRouteState({
    module: args.module,
    workflowKey: args.workflowKey,
    actor: args.actor,
    settings: args.settings,
    draftPayloadFactory: args.livePayloadFactory,
  });
}

export async function listMarksWorkflowSettingsForAdmin() {
  const settingsMap = await buildSettingsMap();
  return {
    ACADEMICS_BULK: settingsMap.get('ACADEMICS_BULK')!,
    PT_BULK: settingsMap.get('PT_BULK')!,
  };
}

export async function updateMarksWorkflowSettingsForAdmin(
  input: MarksWorkflowSettingsUpdateInput,
  actorUserId: string,
) {
  const parsed = marksWorkflowSettingsUpdateSchema.parse(input);
  const normalized = {
    ACADEMICS_BULK: validateWorkflowUserAssignments(parsed.ACADEMICS_BULK, 'ACADEMICS_BULK'),
    PT_BULK: validateWorkflowUserAssignments(parsed.PT_BULK, 'PT_BULK'),
  };

  await assertWorkflowUsersExist([
    ...normalized.ACADEMICS_BULK.dataEntryUserIds,
    ...normalized.ACADEMICS_BULK.verificationUserIds,
    ...normalized.PT_BULK.dataEntryUserIds,
    ...normalized.PT_BULK.verificationUserIds,
  ]);

  await db.transaction(async (tx) => {
    await upsertWorkflowSettingsRow('ACADEMICS_BULK', normalized.ACADEMICS_BULK, actorUserId, tx);
    await upsertWorkflowSettingsRow('PT_BULK', normalized.PT_BULK, actorUserId, tx);
  });

  return listMarksWorkflowSettingsForAdmin();
}

export async function listMarksWorkflowAssignmentsForUser(userId: string) {
  const settings = await listWorkflowSettingsRows();
  return (['ACADEMICS_BULK', 'PT_BULK'] as const).flatMap((module) => {
    const row = settings.find((entry: WorkflowSettingsRow) => entry.module === module) ?? null;
    const normalized = normalizeSettingsRow(row);
    if (!isMarksWorkflowModuleActive(normalized)) return [];
    const actor = resolveWorkflowActorContext({
      settings: normalized,
      userId,
      roles: [],
    });
    const actorTypes = [
      ...(actor.isDataEntryUser ? ['DATA_ENTRY'] : []),
      ...(actor.isVerificationUser ? ['VERIFICATION'] : []),
    ];
    if (!actorTypes.length) return [];
    return [
      {
        module: module as MarksWorkflowModule,
        actorTypes,
      },
    ];
  });
}

export async function getWorkflowModuleSettings(module: MarksWorkflowModule) {
  return resolveSettingsResponse(module, normalizeSettingsRow(await getWorkflowSettingsRow(module)));
}

export async function isWorkflowModuleEnabled(module: MarksWorkflowModule) {
  const settings = normalizeSettingsRow(await getWorkflowSettingsRow(module));
  return isMarksWorkflowModuleActive(settings);
}

export async function assertWorkflowDirectWriteAllowed(module: MarksWorkflowModule) {
  const enabled = await isWorkflowModuleEnabled(module);
  if (enabled) {
    throw new ApiError(
      409,
      'This data is managed through the review workflow. Submit or verify changes from the bulk workflow page.',
      'workflow_required',
      { module },
    );
  }
}

export async function getAcademicsWorkflowState(
  actor: ActorContext,
  args: { courseId: string; semester: number; subjectId: string },
) {
  const settings = await getWorkflowModuleSettings('ACADEMICS_BULK');
  const workflowKey = buildAcademicsWorkflowKey(args.courseId, args.semester, args.subjectId);
  return buildWorkflowRouteState({
    module: 'ACADEMICS_BULK',
    workflowKey,
    actor,
    settings,
    draftPayloadFactory: () => buildAcademicsLiveDraftPayload(args),
  });
}

export async function applyAcademicsWorkflowAction(
  actor: ActorContext,
  args: { courseId: string; semester: number; subjectId: string },
  action: MarksWorkflowTicketActionInput,
) {
  const settings = await getWorkflowModuleSettings('ACADEMICS_BULK');
  const workflowKey = buildAcademicsWorkflowKey(args.courseId, args.semester, args.subjectId);
  return mutateWorkflowTicket({
    module: 'ACADEMICS_BULK',
    workflowKey,
    actor,
    settings,
    action,
    livePayloadFactory: () => buildAcademicsLiveDraftPayload(args),
    validatePayload: (payload) => validateAcademicsDraftPayload(args, payload as AcademicWorkflowDraftPayload),
    publishPayload: (payload, publishActor) => publishAcademicsDraft(payload as AcademicWorkflowDraftPayload, publishActor),
    deepLinkFactory: () =>
      buildWorkflowDeepLink({
        module: 'ACADEMICS_BULK',
        courseId: args.courseId,
        semester: args.semester,
        subjectId: args.subjectId,
      }),
    subjectId: args.subjectId,
  });
}

export async function getPtWorkflowState(
  actor: ActorContext,
  args: { courseId: string; semester: number },
) {
  const settings = await getWorkflowModuleSettings('PT_BULK');
  const workflowKey = buildPtWorkflowKey(args.courseId, args.semester);
  return buildWorkflowRouteState({
    module: 'PT_BULK',
    workflowKey,
    actor,
    settings,
    draftPayloadFactory: () => buildPtLiveDraftPayload(args),
  });
}

export async function applyPtWorkflowAction(
  actor: ActorContext,
  args: { courseId: string; semester: number },
  action: MarksWorkflowTicketActionInput,
) {
  const settings = await getWorkflowModuleSettings('PT_BULK');
  const workflowKey = buildPtWorkflowKey(args.courseId, args.semester);
  return mutateWorkflowTicket({
    module: 'PT_BULK',
    workflowKey,
    actor,
    settings,
    action,
    livePayloadFactory: () => buildPtLiveDraftPayload(args),
    validatePayload: (payload) => validatePtDraftPayload(args, payload as PtWorkflowDraftPayload),
    publishPayload: (payload) => publishPtDraft(payload as PtWorkflowDraftPayload),
    deepLinkFactory: () =>
      buildWorkflowDeepLink({
        module: 'PT_BULK',
        courseId: args.courseId,
        semester: args.semester,
      }),
  });
}

export async function listMyWorkflowNotifications(userId: string) {
  const rows = await listWorkflowNotificationsForUser(userId);
  const actorIds = Array.from(
    new Set(rows.map((row: WorkflowNotificationRow) => row.actorUserId).filter(Boolean) as string[]),
  );
  const actorRows = await listWorkflowActorUsersByIds(actorIds);
  const actorById = new Map<string, WorkflowActorUserRow>(
    actorRows.map((row: WorkflowActorUserRow) => [row.id, row]),
  );

  return rows.map((row: WorkflowNotificationRow) => ({
    id: row.id,
    module: row.module,
    workflowStatus: row.workflowStatus,
    selectionLabel: row.selectionLabel,
    message: row.message,
    deepLink: row.deepLink,
    readAt: row.readAt,
    createdAt: row.createdAt,
    actor: row.actorUserId
      ? {
          id: row.actorUserId,
          name: actorById.get(row.actorUserId)?.name ?? 'Unknown User',
          rank: actorById.get(row.actorUserId)?.rank ?? '',
          username: actorById.get(row.actorUserId)?.username ?? '',
        }
      : null,
  }));
}

export async function applyWorkflowNotificationAction(userId: string, input: WorkflowNotificationActionInput) {
  const action = workflowNotificationActionSchema.parse(input);
  if (action.action === 'MARK_AS_READ') {
    const row = await markWorkflowNotificationRead(userId, action.notificationId);
    if (!row) {
      throw new ApiError(404, 'Notification not found.', 'not_found', { notificationId: action.notificationId });
    }
  }
  if (action.action === 'MARK_ALL_AS_READ') {
    await markAllWorkflowNotificationsRead(userId);
  }
  return listMyWorkflowNotifications(userId);
}
