import { randomUUID } from 'crypto';
import { db } from '@/app/db/client';
import { auditLogs } from '@/app/db/schema/auth/audit';
import { NextRequest } from 'next/server';
import type { InferInsertModel } from 'drizzle-orm';

export type AuditOutcome = 'SUCCESS' | 'FAILURE' | 'DENIED' | 'ERROR';

const requestContexts = new WeakMap<Request, RequestContext>();

const ACCESS_ONLY_EVENTS = new Set(['ACCESS.REQUEST']);
const SENSITIVE_KEYS = ['password', 'token', 'secret', 'authorization', 'cookie', 'otp', 'hash'];
const PARTIAL_MASK_KEYS = ['email', 'phone', 'mobile'];

export const AuditEventType = {
  LOGIN_SUCCESS: 'AUTH.LOGIN_SUCCESS',
  LOGIN_FAILURE: 'AUTH.LOGIN_FAILURE',
  LOGOUT: 'AUTH.LOGOUT',
  SIGNUP_REQUEST: 'AUTH.SIGNUP_REQUEST',
  ACCOUNT_LOCKED: 'AUTH.ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED: 'AUTH.ACCOUNT_UNLOCKED',
  PASSWORD_CHANGED: 'AUTH.PASSWORD_CHANGE',
  PASSWORD_RESET_REQUESTED: 'AUTH.PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_COMPLETED: 'AUTH.PASSWORD_RESET_COMPLETE',
  USER_CREATED: 'USER.CREATE',
  USER_UPDATED: 'USER.UPDATE',
  USER_DELETED: 'USER.DELETE',
  USER_ACTIVATED: 'USER.STATUS_CHANGE',
  USER_DEACTIVATED: 'USER.STATUS_CHANGE',
  OC_CREATED: 'OC.CREATE',
  OC_UPDATED: 'OC.UPDATE',
  OC_DELETED: 'OC.DELETE',
  OC_BULK_IMPORTED: 'SYSTEM.BULK_IMPORT',
  SIGNUP_REQUEST_CREATED: 'SIGNUP.REQUEST_CREATE',
  SIGNUP_REQUEST_APPROVED: 'SIGNUP.REQUEST_APPROVE',
  SIGNUP_REQUEST_REJECTED: 'SIGNUP.REQUEST_REJECT',
  SIGNUP_REQUEST_DELETED: 'SIGNUP.REQUEST_DELETE',
  ROLE_ASSIGNED: 'USER.ROLE_ASSIGN',
  ROLE_REVOKED: 'USER.ROLE_REVOKE',
  PERMISSION_GRANTED: 'USER.ROLE_ASSIGN',
  PERMISSION_REVOKED: 'USER.ROLE_REVOKE',
  APPOINTMENT_CREATED: 'APPOINTMENT.CREATE',
  APPOINTMENT_UPDATED: 'APPOINTMENT.UPDATE',
  APPOINTMENT_DELETED: 'APPOINTMENT.DELETE',
  APPOINTMENT_TRANSFERRED: 'APPOINTMENT.TRANSFER',
  DELEGATION_CREATED: 'DELEGATION.CREATE',
  DELEGATION_REVOKED: 'DELEGATION.DELETE',
  SENSITIVE_DATA_ACCESSED: 'SECURITY.DATA_ACCESS',
  SENSITIVE_DATA_EXPORTED: 'SECURITY.DATA_EXPORT',
  UNAUTHORIZED_ACCESS_ATTEMPT: 'SECURITY.UNAUTHORIZED_ACCESS',
  CSRF_VIOLATION: 'SECURITY.CSRF_BLOCK',
  RATE_LIMIT_EXCEEDED: 'SECURITY.RATE_LIMIT',
  API_REQUEST: 'ACCESS.REQUEST',
  SUBJECT_CREATED: 'SUBJECT.CREATE',
  SUBJECT_UPDATED: 'SUBJECT.UPDATE',
  SUBJECT_DELETED: 'SUBJECT.DELETE',
  COURSE_CREATED: 'COURSE.CREATE',
  COURSE_UPDATED: 'COURSE.UPDATE',
  COURSE_DELETED: 'COURSE.DELETE',
  COURSE_OFFERING_CREATED: 'COURSE.OFFERING_CREATE',
  COURSE_OFFERING_UPDATED: 'COURSE.OFFERING_UPDATE',
  COURSE_OFFERING_DELETED: 'COURSE.OFFERING_DELETE',
  COURSE_OFFERINGS_ASSIGNED: 'COURSE.OFFERINGS_ASSIGN',
  INSTRUCTOR_CREATED: 'INSTRUCTOR.CREATE',
  INSTRUCTOR_UPDATED: 'INSTRUCTOR.UPDATE',
  INSTRUCTOR_DELETED: 'INSTRUCTOR.DELETE',
  PUNISHMENT_CREATED: 'PUNISHMENT.CREATE',
  PUNISHMENT_UPDATED: 'PUNISHMENT.UPDATE',
  PUNISHMENT_DELETED: 'PUNISHMENT.DELETE',
  POSITION_CREATED: 'POSITION.CREATE',
  POSITION_UPDATED: 'POSITION.UPDATE',
  POSITION_DELETED: 'POSITION.DELETE',
  PLATOON_CREATED: 'PLATOON.CREATE',
  PLATOON_UPDATED: 'PLATOON.UPDATE',
  PLATOON_DELETED: 'PLATOON.DELETE',
  TRAINING_CAMP_CREATED: 'TRAINING_CAMP.CREATE',
  TRAINING_CAMP_UPDATED: 'TRAINING_CAMP.UPDATE',
  TRAINING_CAMP_DELETED: 'TRAINING_CAMP.DELETE',
  TRAINING_CAMP_ACTIVITY_CREATED: 'TRAINING_CAMP_ACTIVITY.CREATE',
  TRAINING_CAMP_ACTIVITY_UPDATED: 'TRAINING_CAMP_ACTIVITY.UPDATE',
  TRAINING_CAMP_ACTIVITY_DELETED: 'TRAINING_CAMP_ACTIVITY.DELETE',
  PT_TYPE_CREATED: 'PT.TYPE.CREATE',
  PT_TYPE_UPDATED: 'PT.TYPE.UPDATE',
  PT_TYPE_DELETED: 'PT.TYPE.DELETE',
  PT_ATTEMPT_CREATED: 'PT.ATTEMPT.CREATE',
  PT_ATTEMPT_UPDATED: 'PT.ATTEMPT.UPDATE',
  PT_ATTEMPT_DELETED: 'PT.ATTEMPT.DELETE',
  PT_GRADE_CREATED: 'PT.GRADE.CREATE',
  PT_GRADE_UPDATED: 'PT.GRADE.UPDATE',
  PT_GRADE_DELETED: 'PT.GRADE.DELETE',
  PT_TASK_CREATED: 'PT.TASK.CREATE',
  PT_TASK_UPDATED: 'PT.TASK.UPDATE',
  PT_TASK_DELETED: 'PT.TASK.DELETE',
  PT_TASK_SCORE_CREATED: 'PT.TASK_SCORE.CREATE',
  PT_TASK_SCORE_UPDATED: 'PT.TASK_SCORE.UPDATE',
  PT_TASK_SCORE_DELETED: 'PT.TASK_SCORE.DELETE',
  PT_MOTIVATION_FIELD_CREATED: 'PT.MOTIVATION_FIELD.CREATE',
  PT_MOTIVATION_FIELD_UPDATED: 'PT.MOTIVATION_FIELD.UPDATE',
  PT_MOTIVATION_FIELD_DELETED: 'PT.MOTIVATION_FIELD.DELETE',
  INTERVIEW_TEMPLATE_CREATED: 'INTERVIEW.TEMPLATE.CREATE',
  INTERVIEW_TEMPLATE_UPDATED: 'INTERVIEW.TEMPLATE.UPDATE',
  INTERVIEW_TEMPLATE_DELETED: 'INTERVIEW.TEMPLATE.DELETE',
  INTERVIEW_TEMPLATE_SEMESTER_ADDED: 'INTERVIEW.TEMPLATE_SEMESTER.ADD',
  INTERVIEW_TEMPLATE_SEMESTER_REMOVED: 'INTERVIEW.TEMPLATE_SEMESTER.REMOVE',
  INTERVIEW_SECTION_CREATED: 'INTERVIEW.SECTION.CREATE',
  INTERVIEW_SECTION_UPDATED: 'INTERVIEW.SECTION.UPDATE',
  INTERVIEW_SECTION_DELETED: 'INTERVIEW.SECTION.DELETE',
  INTERVIEW_GROUP_CREATED: 'INTERVIEW.GROUP.CREATE',
  INTERVIEW_GROUP_UPDATED: 'INTERVIEW.GROUP.UPDATE',
  INTERVIEW_GROUP_DELETED: 'INTERVIEW.GROUP.DELETE',
  INTERVIEW_FIELD_CREATED: 'INTERVIEW.FIELD.CREATE',
  INTERVIEW_FIELD_UPDATED: 'INTERVIEW.FIELD.UPDATE',
  INTERVIEW_FIELD_DELETED: 'INTERVIEW.FIELD.DELETE',
  INTERVIEW_FIELD_OPTION_CREATED: 'INTERVIEW.FIELD_OPTION.CREATE',
  INTERVIEW_FIELD_OPTION_UPDATED: 'INTERVIEW.FIELD_OPTION.UPDATE',
  INTERVIEW_FIELD_OPTION_DELETED: 'INTERVIEW.FIELD_OPTION.DELETE',
  OC_ACADEMICS_SUMMARY_UPDATED: 'OC.ACADEMICS.SUMMARY_UPDATE',
  OC_ACADEMICS_SUBJECT_UPDATED: 'OC.ACADEMICS.SUBJECT_UPDATE',
  OC_ACADEMICS_SUBJECT_DELETED: 'OC.ACADEMICS.SUBJECT_DELETE',
  OC_ACADEMICS_SEMESTER_DELETED: 'OC.ACADEMICS.SEMESTER_DELETE',
  OC_RECORD_CREATED: 'OC.RECORD.CREATE',
  OC_RECORD_UPDATED: 'OC.RECORD.UPDATE',
  OC_RECORD_DELETED: 'OC.RECORD.DELETE',
} as const;

export const AuditResourceType = {
  USER: 'user',
  APPOINTMENT: 'appointment',
  DELEGATION: 'delegation',
  ROLE: 'role',
  PERMISSION: 'permission',
  OC: 'oc',
  COURSE: 'course',
  OFFERING: 'course_offering',
  INSTRUCTOR: 'instructor',
  PLATOON: 'platoon',
  POSITION: 'position',
  PUNISHMENT: 'punishment',
  SIGNUP_REQUEST: 'signup_request',
  TRAINING_CAMP: 'training_camp',
  TRAINING_CAMP_ACTIVITY: 'training_camp_activity',
  PT_TYPE: 'pt_type',
  PT_ATTEMPT: 'pt_attempt',
  PT_GRADE: 'pt_grade',
  PT_TASK: 'pt_task',
  PT_TASK_SCORE: 'pt_task_score',
  PT_MOTIVATION_FIELD: 'pt_motivation_field',
  INTERVIEW_TEMPLATE: 'interview_template',
  INTERVIEW_SECTION: 'interview_section',
  INTERVIEW_GROUP: 'interview_group',
  INTERVIEW_FIELD: 'interview_field',
  INTERVIEW_FIELD_OPTION: 'interview_field_option',
  SUBJECT: 'subject',
  OC_ACADEMICS: 'oc_academics',
  API: 'api',
} as const;

export type AuditDiff = {
  added?: Record<string, unknown>;
  removed?: Record<string, unknown>;
  changed?: Record<string, { before: unknown; after: unknown }>;
};

export type CreateAuditLogParams = {
  actorUserId?: string | null;
  actorRoles?: string[];
  tenantId?: string | null;
  eventType: string;
  resourceType: string;
  resourceId?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  request?: NextRequest | Request;
  method?: string | null;
  path?: string | null;
  statusCode?: number | null;
  outcome?: AuditOutcome;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  diff?: AuditDiff | null;
  changedFields?: string[] | null;
  requestId?: string;
  required?: boolean;
  finalizeAccessLog?: boolean;
  client?: Pick<typeof db, 'insert'>;
};

export function ensureRequestContext(req?: NextRequest | Request | null) {
  if (!req) return null;
  const existing = requestContexts.get(req);
  if (existing) return existing;
  const details = extractRequestDetails(req);
  const ctx: RequestContext = {
    requestId: details.requestId,
    method: details.method,
    pathname: details.pathname,
    url: details.url,
    startTime: Date.now(),
  };
  const inferredTenant = inferTenantFromPath(details.pathname);
  if (inferredTenant) {
    ctx.tenantId = inferredTenant;
  }
  requestContexts.set(req, ctx);
  return ctx;
}

export function noteRequestActor(req: NextRequest | Request, actorUserId: string | null, roles?: string[]) {
  const ctx = ensureRequestContext(req);
  if (!ctx) return;
  ctx.actorUserId = actorUserId ?? ctx.actorUserId ?? null;
  if (roles?.length) ctx.actorRoles = roles;
}

export function setRequestTenant(req: NextRequest | Request, tenantId: string | null) {
  const ctx = ensureRequestContext(req);
  if (!ctx) return;
  ctx.tenantId = tenantId ?? ctx.tenantId ?? null;
}

export function redactSensitiveData<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((entry) => redactSensitiveData(entry)) as T;
  }
  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, v]) => {
      if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k))) {
        output[key] = '***REDACTED***';
      } else if (PARTIAL_MASK_KEYS.some((k) => key.toLowerCase().includes(k)) && typeof v === 'string') {
        output[key] = maskValue(key, v);
      } else {
        output[key] = redactSensitiveData(v);
      }
    });
    return output as T;
  }
  return value;
}

export function computeDiff(
  before?: Record<string, unknown> | null,
  after?: Record<string, unknown> | null
): { diff: AuditDiff | null; changedFields: string[] } {
  if (!before && !after) return { diff: null, changedFields: [] };
  const diff: AuditDiff = {};
  const changedFields: string[] = [];
  const keys = new Set<string>([
    ...(before ? Object.keys(before) : []),
    ...(after ? Object.keys(after) : []),
  ]);

  keys.forEach((key) => {
    const prevVal = before ? before[key] : undefined;
    const nextVal = after ? after[key] : undefined;
    if (prevVal === undefined && nextVal !== undefined) {
      diff.added = { ...(diff.added ?? {}), [key]: nextVal };
      changedFields.push(key);
      return;
    }
    if (prevVal !== undefined && nextVal === undefined) {
      diff.removed = { ...(diff.removed ?? {}), [key]: prevVal };
      changedFields.push(key);
      return;
    }
    if (!deepEqual(prevVal, nextVal)) {
      diff.changed = {
        ...(diff.changed ?? {}),
        [key]: { before: prevVal, after: nextVal },
      };
      changedFields.push(key);
    }
  });

  const hasDiff = Boolean(diff.added || diff.removed || diff.changed);
  return { diff: hasDiff ? diff : null, changedFields };
}

export async function createAuditLog(params: CreateAuditLogParams) {
  const ctx = params.request ? ensureRequestContext(params.request) : null;
  if (params.request && params.actorUserId !== undefined) {
    noteRequestActor(params.request, params.actorUserId ?? null, params.actorRoles);
  }

  const details = params.request ? extractRequestDetails(params.request) : null;
  const requestId = params.requestId ?? ctx?.requestId ?? details?.requestId ?? randomUUID();
  if (ctx && !ctx.requestId) ctx.requestId = requestId;

  const method = params.method ?? ctx?.method ?? details?.method ?? null;
  const path = params.path ?? ctx?.pathname ?? details?.pathname ?? null;
  const statusCode = params.statusCode ?? null;
  const outcome: AuditOutcome = params.outcome ?? 'SUCCESS';
  const tenantId = params.tenantId ?? ctx?.tenantId ?? null;

  if (ACCESS_ONLY_EVENTS.has(params.eventType)) {
    finalizeAccessLog(ctx ?? createSyntheticContext({ method, path, requestId }), {
      statusCode: statusCode ?? 200,
      outcome,
      eventType: params.eventType,
      resourceType: params.resourceType,
      actorUserId: params.actorUserId ?? ctx?.actorUserId ?? null,
      tenantId,
    });
    return;
  }

  const ipAddress = params.ipAddress ?? (params.request ? getClientIp(params.request) : null);
  const userAgent = params.userAgent ?? (params.request ? getUserAgent(params.request) : null);

  let changedFields = params.changedFields ?? undefined;
  let diff = params.diff ?? null;
  if (!params.diff && (params.before || params.after)) {
    const result = computeDiff(
      params.before ? redactSensitiveData(params.before) : null,
      params.after ? redactSensitiveData(params.after) : null
    );
    diff = result.diff;
    changedFields = result.changedFields;
  }

  const metadata = params.metadata ? redactSensitiveData(params.metadata) : undefined;

  const values: InferInsertModel<typeof auditLogs> = {
    actorUserId: params.actorUserId ?? null,
    tenantId,
    eventType: params.eventType,
    resourceType: params.resourceType,
    resourceId: params.resourceId ?? null,
    method,
    path,
    statusCode,
    outcome,
    requestId,
    description: params.description ?? null,
    metadata: metadata ?? null,
    changedFields: changedFields && changedFields.length ? changedFields : null,
    diff: diff ?? null,
    ipAddr: ipAddress,
    userAgent,
  };

  try {
    await (params.client ?? db).insert(auditLogs).values(values);
  } catch (error) {
    console.error('Failed to create audit log', {
      eventType: params.eventType,
      resourceType: params.resourceType,
      requestId,
      error,
    });
    if (params.required) {
      throw error;
    }
    return;
  }

  if (params.finalizeAccessLog) {
    finalizeAccessLog(ctx ?? createSyntheticContext({ method, path, requestId }), {
      statusCode: statusCode ?? 200,
      outcome,
      actorUserId: params.actorUserId ?? ctx?.actorUserId ?? null,
      tenantId,
      eventType: params.eventType,
      resourceType: params.resourceType,
    });
  }
}

export function logApiRequest(params: {
  request: NextRequest | Request;
  userId?: string | null;
  roles?: string[];
  statusCode?: number;
  outcome?: AuditOutcome;
  metadata?: Record<string, unknown>;
  finalize?: boolean;
}) {
  const ctx = ensureRequestContext(params.request);
  if (params.userId !== undefined) {
    noteRequestActor(params.request, params.userId, params.roles);
  }
  if (ctx && params.metadata) {
    ctx.metadata = { ...(ctx.metadata ?? {}), ...redactSensitiveData(params.metadata) };
  }
  if (params.finalize) {
    finalizeAccessLog(ctx, {
      statusCode: params.statusCode ?? 200,
      outcome: params.outcome ?? 'SUCCESS',
      eventType: AuditEventType.API_REQUEST,
      resourceType: AuditResourceType.API,
      metadata: params.metadata,
      actorUserId: params.userId ?? ctx?.actorUserId ?? null,
      tenantId: ctx?.tenantId ?? null,
    });
  }
}

export async function logLoginSuccess(params: {
  userId: string;
  username: string;
  appointmentId: string;
  request: NextRequest | Request;
}) {
  await createAuditLog({
    actorUserId: params.userId,
    actorRoles: [],
    eventType: AuditEventType.LOGIN_SUCCESS,
    resourceType: AuditResourceType.USER,
    resourceId: params.userId,
    description: `User ${params.username} logged in successfully`,
    metadata: {
      username: params.username,
      appointmentId: params.appointmentId,
    },
    outcome: 'SUCCESS',
    statusCode: 200,
    request: params.request,
  });
}

export async function logLoginFailure(params: {
  userId?: string | null;
  username: string;
  reason: string;
  request: NextRequest | Request;
}) {
  await createAuditLog({
    actorUserId: params.userId ?? null,
    eventType: AuditEventType.LOGIN_FAILURE,
    resourceType: AuditResourceType.USER,
    resourceId: params.userId ?? null,
    description: `Failed login attempt for user ${params.username}: ${params.reason}`,
    metadata: {
      username: params.username,
      reason: params.reason,
    },
    outcome: 'FAILURE',
    statusCode: 401,
    request: params.request,
    finalizeAccessLog: true,
  });
}

export async function logLogout(params: {
  userId: string;
  username: string;
  request?: NextRequest | Request;
}) {
  await createAuditLog({
    actorUserId: params.userId,
    eventType: AuditEventType.LOGOUT,
    resourceType: AuditResourceType.USER,
    resourceId: params.userId,
    description: `User ${params.username} logged out`,
    metadata: { username: params.username },
    outcome: 'SUCCESS',
    statusCode: 204,
    request: params.request,
  });
}

export async function logAccountLocked(params: {
  userId: string;
  username: string;
  failedAttempts: number;
  lockedUntil: Date;
  request: NextRequest | Request;
}) {
  await createAuditLog({
    actorUserId: null,
    eventType: AuditEventType.ACCOUNT_LOCKED,
    resourceType: AuditResourceType.USER,
    resourceId: params.userId,
    description: `Account locked for user ${params.username} after ${params.failedAttempts} failed login attempts`,
    metadata: {
      username: params.username,
      failedAttempts: params.failedAttempts,
      lockedUntil: params.lockedUntil.toISOString(),
    },
    outcome: 'DENIED',
    statusCode: 403,
    request: params.request,
  });
}

export async function logAccountUnlocked(params: {
  userId: string;
  username: string;
  unlockedBy: string;
  request?: NextRequest | Request;
}) {
  await createAuditLog({
    actorUserId: params.unlockedBy,
    eventType: AuditEventType.ACCOUNT_UNLOCKED,
    resourceType: AuditResourceType.USER,
    resourceId: params.userId,
    description: `Account unlocked for user ${params.username}`,
    metadata: {
      username: params.username,
      unlockedBy: params.unlockedBy,
    },
    outcome: 'SUCCESS',
    request: params.request,
  });
}

export async function logPasswordChanged(params: {
  userId: string;
  username: string;
  changedBy: string;
  request?: NextRequest | Request;
}) {
  await createAuditLog({
    actorUserId: params.changedBy,
    eventType: AuditEventType.PASSWORD_CHANGED,
    resourceType: AuditResourceType.USER,
    resourceId: params.userId,
    description: `Password changed for user ${params.username}`,
    metadata: {
      username: params.username,
      changedBy: params.changedBy,
      selfChange: params.userId === params.changedBy,
    },
    outcome: 'SUCCESS',
    statusCode: 200,
    request: params.request,
    required: params.userId !== params.changedBy,
  });
}

export async function logUserCreated(params: {
  userId: string;
  username: string;
  createdBy: string;
  request?: NextRequest | Request;
}) {
  await createAuditLog({
    actorUserId: params.createdBy,
    eventType: AuditEventType.USER_CREATED,
    resourceType: AuditResourceType.USER,
    resourceId: params.userId,
    description: `User ${params.username} created`,
    metadata: {
      username: params.username,
      createdBy: params.createdBy,
    },
    outcome: 'SUCCESS',
    statusCode: 201,
    request: params.request,
    required: true,
  });
}

export async function logUserUpdated(params: {
  userId: string;
  username: string;
  updatedBy: string;
  changes: Record<string, unknown>;
  request?: NextRequest | Request;
}) {
  await createAuditLog({
    actorUserId: params.updatedBy,
    eventType: AuditEventType.USER_UPDATED,
    resourceType: AuditResourceType.USER,
    resourceId: params.userId,
    description: `User ${params.username} updated`,
    metadata: {
      username: params.username,
      updatedBy: params.updatedBy,
      changedFields: Object.keys(params.changes),
      changes: params.changes,
    },
    changedFields: Object.keys(params.changes),
    outcome: 'SUCCESS',
    statusCode: 200,
    request: params.request,
  });
}

export async function logUserDeleted(params: {
  userId: string;
  username: string;
  deletedBy: string;
  request?: NextRequest | Request;
  hard?: boolean;
}) {
  await createAuditLog({
    actorUserId: params.deletedBy,
    eventType: AuditEventType.USER_DELETED,
    resourceType: AuditResourceType.USER,
    resourceId: params.userId,
    description: `${params.hard ? 'Hard' : 'Soft'} deleted user ${params.username}`,
    metadata: {
      username: params.username,
      deletedBy: params.deletedBy,
      hardDeleted: Boolean(params.hard),
    },
    outcome: 'SUCCESS',
    statusCode: 200,
    request: params.request,
    required: true,
  });
}

export async function logAppointmentCreated(params: {
  appointmentId: string;
  userId: string;
  positionKey: string;
  createdBy: string;
  request?: NextRequest | Request;
}) {
  await createAuditLog({
    actorUserId: params.createdBy,
    eventType: AuditEventType.APPOINTMENT_CREATED,
    resourceType: AuditResourceType.APPOINTMENT,
    resourceId: params.appointmentId,
    description: `Appointment created for position ${params.positionKey}`,
    metadata: {
      userId: params.userId,
      positionKey: params.positionKey,
      createdBy: params.createdBy,
    },
    outcome: 'SUCCESS',
    statusCode: 201,
    request: params.request,
    required: true,
  });
}

export async function logAppointmentUpdated(params: {
  appointmentId: string;
  changes: Record<string, unknown>;
  updatedBy: string;
  request?: NextRequest | Request;
}) {
  await createAuditLog({
    actorUserId: params.updatedBy,
    eventType: AuditEventType.APPOINTMENT_UPDATED,
    resourceType: AuditResourceType.APPOINTMENT,
    resourceId: params.appointmentId,
    description: `Appointment updated`,
    metadata: {
      updatedBy: params.updatedBy,
      changes: params.changes,
    },
    changedFields: Object.keys(params.changes),
    outcome: 'SUCCESS',
    statusCode: 200,
    request: params.request,
  });
}

export async function logUnauthorizedAccess(params: {
  userId?: string | null;
  resourceType: string;
  resourceId?: string | null;
  reason: string;
  request: NextRequest | Request;
}) {
  await createAuditLog({
    actorUserId: params.userId ?? null,
    eventType: AuditEventType.UNAUTHORIZED_ACCESS_ATTEMPT,
    resourceType: params.resourceType,
    resourceId: params.resourceId ?? null,
    description: `Unauthorized access attempt: ${params.reason}`,
    metadata: { reason: params.reason },
    outcome: 'DENIED',
    statusCode: 403,
    request: params.request,
    finalizeAccessLog: true,
  });
}

export async function logCsrfViolation(params: {
  userId?: string | null;
  request: NextRequest | Request;
}) {
  await createAuditLog({
    actorUserId: params.userId ?? null,
    eventType: AuditEventType.CSRF_VIOLATION,
    resourceType: 'security',
    description: 'CSRF token validation failed',
    outcome: 'DENIED',
    statusCode: 403,
    request: params.request,
    finalizeAccessLog: true,
  });
}

export async function logRateLimitExceeded(params: {
  userId?: string | null;
  limitType: string;
  request: NextRequest | Request;
}) {
  await createAuditLog({
    actorUserId: params.userId ?? null,
    eventType: AuditEventType.RATE_LIMIT_EXCEEDED,
    resourceType: 'security',
    description: `Rate limit exceeded: ${params.limitType}`,
    metadata: { limitType: params.limitType },
    outcome: 'DENIED',
    statusCode: 429,
    request: params.request,
    finalizeAccessLog: true,
  });
}

type RequestContext = {
  requestId: string;
  method: string;
  pathname: string;
  url: string;
  startTime: number;
  actorUserId?: string | null;
  actorRoles?: string[];
  tenantId?: string | null;
  accessLogged?: boolean;
  metadata?: Record<string, unknown>;
};

type AccessLogPayload = {
  timestamp: string;
  requestId: string;
  method: string;
  path: string;
  durationMs: number;
  statusCode: number;
  outcome: AuditOutcome;
  actorUserId: string | null;
  tenantId: string | null;
  eventType: string;
  resourceType: string;
  metadata?: Record<string, unknown>;
};

function finalizeAccessLog(ctx: RequestContext | null, overrides?: Partial<AccessLogPayload>) {
  if (!ctx || ctx.accessLogged) return;
  ctx.accessLogged = true;
  const durationMs = Date.now() - ctx.startTime;
  const payload: AccessLogPayload = {
    timestamp: new Date().toISOString(),
    requestId: ctx.requestId,
    method: ctx.method,
    path: ctx.pathname,
    durationMs,
    statusCode: overrides?.statusCode ?? 200,
    outcome: overrides?.outcome ?? 'SUCCESS',
    actorUserId: overrides?.actorUserId ?? ctx.actorUserId ?? null,
    tenantId: overrides?.tenantId ?? ctx.tenantId ?? null,
    eventType: overrides?.eventType ?? AuditEventType.API_REQUEST,
    resourceType: overrides?.resourceType ?? AuditResourceType.API,
    metadata: overrides?.metadata ?? ctx.metadata,
  };
  console.log(JSON.stringify({ type: 'access.log', ...payload }));
}

function createSyntheticContext(opts: {
  method: string | null;
  path: string | null;
  requestId: string;
}): RequestContext {
  return {
    requestId: opts.requestId,
    method: opts.method ?? 'UNKNOWN',
    pathname: opts.path ?? '',
    url: opts.path ?? '',
    startTime: Date.now(),
  };
}

function extractRequestDetails(req: NextRequest | Request) {
  const method = req.method ?? 'UNKNOWN';
  if ('nextUrl' in req && (req as NextRequest).nextUrl) {
    const nextUrl = (req as NextRequest).nextUrl;
    const pathname = nextUrl.pathname;
    return {
      method,
      pathname,
      search: nextUrl.search,
      url: nextUrl.toString(),
      requestId: req.headers.get('x-request-id') ?? randomUUID(),
    };
  }
  try {
    const parsed = new URL(req.url ?? '');
    return {
      method,
      pathname: parsed.pathname,
      search: parsed.search,
      url: parsed.toString(),
      requestId: req.headers.get('x-request-id') ?? randomUUID(),
    };
  } catch {
    return {
      method,
      pathname: '',
      search: '',
      url: req.url ?? '',
      requestId: randomUUID(),
    };
  }
}

function inferTenantFromPath(pathname?: string | null) {
  if (!pathname) return null;
  const ocMatch = pathname.match(/^\/api\/v1\/oc\/([0-9a-f-]{36})/i);
  if (ocMatch) return ocMatch[1];
  const platoonMatch = pathname.match(/^\/api\/v1\/platoons\/([0-9a-f-]{36})/i);
  if (platoonMatch) return platoonMatch[1];
  return null;
}

function getClientIp(req: NextRequest | Request): string | null {
  if ('headers' in req && typeof req.headers.get === 'function') {
    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor) return forwardedFor.split(',')[0].trim();
    const realIp = req.headers.get('x-real-ip');
    if (realIp) return realIp.trim();
  }
  return null;
}

function getUserAgent(req: NextRequest | Request): string | null {
  if ('headers' in req && typeof req.headers.get === 'function') {
    return req.headers.get('user-agent');
  }
  return null;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;
  const aEntries = Object.entries(a as Record<string, unknown>);
  const bEntries = Object.entries(b as Record<string, unknown>);
  if (aEntries.length !== bEntries.length) return false;
  return aEntries.every(([key, value]) => deepEqual(value, (b as Record<string, unknown>)[key]));
}

function maskValue(key: string, value: string) {
  if (key.toLowerCase().includes('email')) {
    const [local, domain] = value.split('@');
    return `${local?.[0] ?? '*'}***@${domain ?? '***'}`;
  }
  if (key.toLowerCase().includes('phone') || key.toLowerCase().includes('mobile')) {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return '***';
    return `${'*'.repeat(digits.length - 2)}${digits.slice(-2)}`;
  }
  return '***REDACTED***';
}
