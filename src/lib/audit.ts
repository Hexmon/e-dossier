// src/lib/audit.ts
// Audit logging using @hexmon_tech/audit-* packages
import { createAuditLogger } from '@hexmon_tech/audit-core';
import type { AuditLogger, AuditEventInput } from '@hexmon_tech/audit-core';
import { createPostgresAuditSink } from '@hexmon_tech/audit-sink-postgres';
import { withAudit } from '@hexmon_tech/audit-next';
import type { AuditNextRequest, NextAuditOptions } from '@hexmon_tech/audit-next';
import { NextRequest } from 'next/server';
import { ApiError } from '@/app/lib/http';

// ── Re-export types ───────────────────────────────────────────────
export type { AuditNextRequest, AuditEventInput, AuditLogger };

// ── Audit Event Type Constants ────────────────────────────────────
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
  OC_RELEGATED: 'OC.RELEGATE',
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

// ── Postgres Sink ─────────────────────────────────────────────────
const postgresSink = createPostgresAuditSink({
  connectionString: process.env.DATABASE_URL!,
  tableName: 'audit_events',
});

// ── Audit Logger Singleton ────────────────────────────────────────
export const auditLogger = createAuditLogger({
  service: 'e-dossier',
  environment: process.env.NODE_ENV ?? 'development',
  sinks: [postgresSink],
  mode: 'QUEUE',
  redaction: { enabled: true },
});

// ── Route Handler Types ───────────────────────────────────────────
type RouteParams = Record<string, string | string[] | undefined>;

export type RouteContext<TParams = RouteParams> = {
  params: Promise<TParams>;
};

type AuditRouteHandler<TParams = undefined> = (
  req: AuditNextRequest,
  context: RouteContext<TParams>
) => Promise<Response> | Response;

// ── Access Log (stdout) ───────────────────────────────────────────
function inferOutcome(status: number): 'SUCCESS' | 'FAILURE' | 'ERROR' {
  if (status >= 500) return 'ERROR';
  if (status >= 400) return 'FAILURE';
  return 'SUCCESS';
}

function logAccess(
  req: NextRequest,
  startTime: number,
  statusCode: number,
  outcome: string,
) {
  const requestId = req.headers.get('x-request-id') ?? '';
  const method = req.method;
  const path = 'nextUrl' in req ? (req as NextRequest).nextUrl.pathname : '';
  console.log(JSON.stringify({
    type: 'access.log',
    timestamp: new Date().toISOString(),
    requestId,
    method,
    path,
    durationMs: Date.now() - startTime,
    statusCode,
    outcome,
  }));
}

// ── withAuditRoute Wrapper ────────────────────────────────────────
export function withAuditRoute<TParams = undefined>(
  _method: string,
  handler: AuditRouteHandler<TParams>,
  options?: NextAuditOptions,
): (req: NextRequest, context: RouteContext<TParams>) => Promise<Response> {
  return withAudit(
    auditLogger,
    async (req: AuditNextRequest, context: RouteContext<TParams>) => {
      const startTime = Date.now();
      const requestIdHeader = req.headers.get('x-request-id');

      try {
        const response = await handler(req, context);
        const status = response.status ?? 200;
        logAccess(req, startTime, status, inferOutcome(status));
        if (requestIdHeader && !response.headers.get('x-request-id')) {
          response.headers.set('x-request-id', requestIdHeader);
        }
        return response;
      } catch (error) {
        const status = error instanceof ApiError ? error.status : 500;
        logAccess(req, startTime, status, status >= 500 ? 'ERROR' : 'FAILURE');
        throw error;
      }
    },
    {
      getRequestId: (req) => req.headers.get('x-request-id') ?? undefined,
      ...options,
    },
  );
}

// ── Diff Computation Helper ───────────────────────────────────────
export type AuditDiff = {
  added?: Record<string, unknown>;
  removed?: Record<string, unknown>;
  changed?: Record<string, { before: unknown; after: unknown }>;
};

export function computeDiff(
  before?: Record<string, unknown> | null,
  after?: Record<string, unknown> | null,
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
    if (JSON.stringify(prevVal) !== JSON.stringify(nextVal)) {
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
