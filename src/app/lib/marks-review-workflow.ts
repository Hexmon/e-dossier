import { ApiError } from '@/app/lib/http';
import { Semester } from '@/app/lib/oc-validators';
import { hasPlatoonCommanderRole } from '@/lib/platoon-commander-access';
import { z } from 'zod';

export const MARKS_WORKFLOW_MODULES = ['ACADEMICS_BULK', 'PT_BULK'] as const;
export type MarksWorkflowModule = (typeof MARKS_WORKFLOW_MODULES)[number];

export const MARKS_WORKFLOW_STATUSES = [
  'DRAFT',
  'PENDING_VERIFICATION',
  'CHANGES_REQUESTED',
  'VERIFIED',
] as const;
export type MarksWorkflowStatus = (typeof MARKS_WORKFLOW_STATUSES)[number];

export const MARKS_WORKFLOW_EVENT_TYPES = [
  'SAVE_DRAFT',
  'SUBMIT_FOR_VERIFICATION',
  'REQUEST_CHANGES',
  'VERIFY_AND_PUBLISH',
  'OVERRIDE_PUBLISH',
] as const;
export type MarksWorkflowEventType = (typeof MARKS_WORKFLOW_EVENT_TYPES)[number];

export const MARKS_WORKFLOW_OVERRIDE_MODES = [
  'SUPER_ADMIN_ONLY',
  'ADMIN_AND_SUPER_ADMIN',
] as const;
export type MarksWorkflowOverrideMode = (typeof MARKS_WORKFLOW_OVERRIDE_MODES)[number];

export const marksWorkflowModuleSchema = z.enum(MARKS_WORKFLOW_MODULES);
export const marksWorkflowStatusSchema = z.enum(MARKS_WORKFLOW_STATUSES);
export const marksWorkflowEventTypeSchema = z.enum(MARKS_WORKFLOW_EVENT_TYPES);
export const marksWorkflowOverrideModeSchema = z.enum(MARKS_WORKFLOW_OVERRIDE_MODES);

const uuidArraySchema = z.array(z.string().uuid()).default([]);

export const marksWorkflowModuleSettingsInputSchema = z.object({
  dataEntryUserIds: uuidArraySchema,
  verificationUserIds: uuidArraySchema,
  postVerificationOverrideMode: marksWorkflowOverrideModeSchema.default('SUPER_ADMIN_ONLY'),
});

export const marksWorkflowSettingsUpdateSchema = z.object({
  ACADEMICS_BULK: marksWorkflowModuleSettingsInputSchema,
  PT_BULK: marksWorkflowModuleSettingsInputSchema,
});

export const academicWorkflowDraftItemSchema = z.object({
  ocId: z.string().uuid(),
  ocNo: z.string().trim().min(1),
  name: z.string().trim().min(1),
  branch: z.string().trim().nullable().optional(),
  theory: z
    .object({
      phaseTest1Marks: z.coerce.number().nullable().optional(),
      phaseTest2Marks: z.coerce.number().nullable().optional(),
      tutorial: z.string().nullable().optional(),
      finalMarks: z.coerce.number().nullable().optional(),
      grade: z.string().trim().nullable().optional(),
    })
    .partial()
    .optional(),
  practical: z
    .object({
      finalMarks: z.coerce.number().nullable().optional(),
      tutorial: z.string().nullable().optional(),
      grade: z.string().trim().nullable().optional(),
    })
    .partial()
    .optional(),
});

export const academicWorkflowDraftPayloadSchema = z.object({
  courseId: z.string().uuid(),
  semester: Semester,
  subjectId: z.string().uuid(),
  subject: z.object({
    id: z.string().uuid(),
    code: z.string().trim().min(1),
    name: z.string().trim().min(1),
    branch: z.string().trim().nullable().optional(),
    hasTheory: z.boolean().optional(),
    hasPractical: z.boolean().optional(),
    defaultTheoryCredits: z.number().nullable().optional(),
    defaultPracticalCredits: z.number().nullable().optional(),
  }),
  items: z.array(academicWorkflowDraftItemSchema),
});

export const ptWorkflowDraftScoreSchema = z.object({
  ptTaskScoreId: z.string().uuid(),
  marksScored: z.coerce.number().int().min(0),
  remark: z.string().trim().max(2000).nullable().optional(),
});

export const ptWorkflowDraftMotivationSchema = z.object({
  fieldId: z.string().uuid(),
  value: z.string().trim().max(4000).nullable().optional(),
});

export const ptWorkflowDraftPayloadSchema = z.object({
  courseId: z.string().uuid(),
  semester: Semester,
  template: z.any(),
  items: z.array(
    z.object({
      oc: z.object({
        id: z.string().uuid(),
        ocNo: z.string().trim().min(1),
        name: z.string().trim().min(1),
        branch: z.string().trim().nullable().optional(),
        platoonId: z.string().uuid().nullable().optional(),
        platoonKey: z.string().trim().nullable().optional(),
        platoonName: z.string().trim().nullable().optional(),
        withdrawnOn: z.string().datetime().nullable().optional(),
      }),
      scores: z.array(ptWorkflowDraftScoreSchema),
      motivationValues: z.array(ptWorkflowDraftMotivationSchema),
    }),
  ),
});

export const marksWorkflowDraftPayloadSchema = z.union([
  academicWorkflowDraftPayloadSchema,
  ptWorkflowDraftPayloadSchema,
]);

export const marksWorkflowTicketActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('SAVE_DRAFT'),
    revision: z.number().int().min(0).nullable().optional(),
    payload: marksWorkflowDraftPayloadSchema,
    message: z.string().trim().max(4000).optional(),
  }),
  z.object({
    action: z.literal('SUBMIT_FOR_VERIFICATION'),
    revision: z.number().int().min(1),
  }),
  z.object({
    action: z.literal('REQUEST_CHANGES'),
    revision: z.number().int().min(1),
    message: z.string().trim().min(1).max(4000),
  }),
  z.object({
    action: z.literal('VERIFY_AND_PUBLISH'),
    revision: z.number().int().min(1),
    message: z.string().trim().max(4000).optional(),
  }),
  z.object({
    action: z.literal('OVERRIDE_PUBLISH'),
    revision: z.number().int().min(1),
    payload: marksWorkflowDraftPayloadSchema,
    message: z.string().trim().min(1).max(4000),
  }),
]);

export const workflowNotificationActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('MARK_AS_READ'),
    notificationId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('MARK_ALL_AS_READ'),
  }),
]);

export type MarksWorkflowSettingsInput = z.infer<typeof marksWorkflowModuleSettingsInputSchema>;
export type MarksWorkflowSettingsUpdateInput = z.infer<typeof marksWorkflowSettingsUpdateSchema>;
export type MarksWorkflowTicketActionInput = z.infer<typeof marksWorkflowTicketActionSchema>;
export type WorkflowNotificationActionInput = z.infer<typeof workflowNotificationActionSchema>;
export type AcademicWorkflowDraftPayload = z.infer<typeof academicWorkflowDraftPayloadSchema>;
export type PtWorkflowDraftPayload = z.infer<typeof ptWorkflowDraftPayloadSchema>;

export type WorkflowActorContext = {
  isDataEntryUser: boolean;
  isVerificationUser: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  canOverrideVerified: boolean;
};

export function dedupeWorkflowUserIds(userIds: string[]): string[] {
  return Array.from(new Set(userIds.map((value) => value.trim()).filter(Boolean)));
}

export function isMarksWorkflowModuleActive(
  settings: Pick<MarksWorkflowSettingsInput, 'dataEntryUserIds' | 'verificationUserIds'> | null | undefined,
): boolean {
  if (!settings) return false;
  return settings.verificationUserIds.length > 0;
}

export function validateWorkflowUserAssignments(
  settings: MarksWorkflowSettingsInput,
  module: MarksWorkflowModule,
): MarksWorkflowSettingsInput {
  const dataEntryUserIds = dedupeWorkflowUserIds(settings.dataEntryUserIds);
  const verificationUserIds = dedupeWorkflowUserIds(settings.verificationUserIds);

  const duplicates = dataEntryUserIds.filter((userId) => verificationUserIds.includes(userId));
  if (duplicates.length > 0) {
    throw new ApiError(
      400,
      `${module} requires different users for data entry and verification.`,
      'invalid_workflow_assignment',
      {
        module,
        duplicates,
      },
    );
  }

  if (dataEntryUserIds.length > 0 && verificationUserIds.length === 0) {
    throw new ApiError(
      400,
      `${module} requires verification users before additional data-entry users can be assigned.`,
      'invalid_workflow_assignment',
      { module },
    );
  }

  return {
    dataEntryUserIds,
    verificationUserIds,
    postVerificationOverrideMode: settings.postVerificationOverrideMode,
  };
}

export function buildAcademicsWorkflowKey(courseId: string, semester: number, subjectId: string): string {
  return `${courseId}:${semester}:${subjectId}`;
}

export function buildPtWorkflowKey(courseId: string, semester: number): string {
  return `${courseId}:${semester}`;
}

export function buildWorkflowSelectionLabel(args: {
  module: MarksWorkflowModule;
  courseLabel: string;
  semester: number;
  subjectLabel?: string | null;
}): string {
  if (args.module === 'ACADEMICS_BULK') {
    return `${args.courseLabel} / Semester ${args.semester} / ${args.subjectLabel ?? 'Subject'}`;
  }
  return `${args.courseLabel} / Semester ${args.semester} / PT Bulk`;
}

export function resolveWorkflowActorContext(args: {
  settings: MarksWorkflowSettingsInput | null | undefined;
  userId: string;
  roles?: string[] | null;
}): WorkflowActorContext {
  const settings = args.settings;
  const roles = new Set((args.roles ?? []).map((role) => String(role).trim().toUpperCase()));
  const isSuperAdmin = roles.has('SUPER_ADMIN');
  const isAdmin = roles.has('ADMIN') || isSuperAdmin;
  const isImplicitPlatoonCommanderMaker = hasPlatoonCommanderRole({
    roles: Array.from(roles),
  });
  const isDataEntryUser = Boolean(settings?.dataEntryUserIds.includes(args.userId)) || isImplicitPlatoonCommanderMaker;
  const isVerificationUser = Boolean(settings?.verificationUserIds.includes(args.userId));
  const canOverrideVerified =
    isSuperAdmin ||
    (isAdmin && settings?.postVerificationOverrideMode === 'ADMIN_AND_SUPER_ADMIN');

  return {
    isDataEntryUser,
    isVerificationUser,
    isSuperAdmin,
    isAdmin,
    canOverrideVerified,
  };
}

export function getAllowedWorkflowActions(args: {
  isActive: boolean;
  status: MarksWorkflowStatus | null;
  actor: WorkflowActorContext;
}): MarksWorkflowEventType[] {
  if (!args.isActive || !args.status) return [];

  const actions = new Set<MarksWorkflowEventType>();

  if (args.status === 'DRAFT' || args.status === 'CHANGES_REQUESTED') {
    if (args.actor.isDataEntryUser) {
      actions.add('SAVE_DRAFT');
      actions.add('SUBMIT_FOR_VERIFICATION');
    }
  }

  if (args.status === 'PENDING_VERIFICATION') {
    if (args.actor.isVerificationUser) {
      actions.add('SAVE_DRAFT');
      actions.add('REQUEST_CHANGES');
      actions.add('VERIFY_AND_PUBLISH');
    }
    if (args.actor.isDataEntryUser) {
      actions.add('REQUEST_CHANGES');
    }
  }

  if (args.status === 'VERIFIED' && args.actor.canOverrideVerified) {
    actions.add('OVERRIDE_PUBLISH');
  }

  return Array.from(actions);
}

export function assertWorkflowRevision(expectedRevision: number | null | undefined, providedRevision: number | null | undefined) {
  if (expectedRevision == null) return;
  if (providedRevision == null || expectedRevision !== providedRevision) {
    throw new ApiError(409, 'This workflow draft was updated by another user. Reload and try again.', 'stale_revision', {
      expectedRevision,
      providedRevision: providedRevision ?? null,
    });
  }
}

export function ensureWorkflowActionAllowed(action: MarksWorkflowEventType, allowedActions: MarksWorkflowEventType[]) {
  if (!allowedActions.includes(action)) {
    throw new ApiError(403, 'You are not allowed to perform this workflow action.', 'forbidden', {
      action,
      allowedActions,
    });
  }
}

export function ensureWorkflowMessageRequired(action: MarksWorkflowEventType, message?: string | null) {
  const requiresMessage = action === 'REQUEST_CHANGES' || action === 'OVERRIDE_PUBLISH';
  if (requiresMessage && !(message ?? '').trim()) {
    throw new ApiError(400, 'A message is required for this workflow action.', 'message_required', { action });
  }
}

export function ensureVerifierDraftMessage(actor: WorkflowActorContext, status: MarksWorkflowStatus | null, message?: string | null) {
  if (status === 'PENDING_VERIFICATION' && actor.isVerificationUser && !(message ?? '').trim()) {
    throw new ApiError(400, 'Verifier draft saves require a message.', 'message_required');
  }
}

export function isWorkflowAssignedUser(
  settings: MarksWorkflowSettingsInput | null | undefined,
  userId: string,
): boolean {
  if (!settings) return false;
  return settings.dataEntryUserIds.includes(userId) || settings.verificationUserIds.includes(userId);
}

export function buildWorkflowDeepLink(args: {
  module: MarksWorkflowModule;
  courseId: string;
  semester: number;
  subjectId?: string | null;
}): string {
  const params = new URLSearchParams({
    courseId: args.courseId,
    semester: String(args.semester),
  });
  if (args.module === 'ACADEMICS_BULK' && args.subjectId) {
    params.set('subjectId', args.subjectId);
    return `/dashboard/manage-marks?${params.toString()}`;
  }
  return `/dashboard/manage-pt-marks?${params.toString()}`;
}

export function buildAcademicsPublishItems(payload: AcademicWorkflowDraftPayload) {
  return payload.items.map((item) => ({
    ocId: item.ocId,
    semester: payload.semester,
    subjectId: payload.subjectId,
    theory: item.theory,
    practical: item.practical,
  }));
}

export function buildPtPublishItems(payload: PtWorkflowDraftPayload) {
  return payload.items.map((item) => ({
    ocId: item.oc.id,
    semester: payload.semester,
    scores: item.scores,
    motivationValues: item.motivationValues,
  }));
}
