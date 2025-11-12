// src/lib/audit-log.ts
// SECURITY FIX: Comprehensive audit logging for security-sensitive operations
import { db } from '@/app/db/client';
import { auditLogs } from '@/app/db/schema/auth/audit';
import { NextRequest } from 'next/server';

/**
 * Audit Event Types
 */
export const AuditEventType = {
  // Authentication Events
  LOGIN_SUCCESS: 'auth.login.success',
  LOGIN_FAILURE: 'auth.login.failure',
  LOGOUT: 'auth.logout',
  SIGNUP_REQUEST: 'auth.signup.request',
  ACCOUNT_LOCKED: 'auth.account.locked',
  ACCOUNT_UNLOCKED: 'auth.account.unlocked',
  
  // Password Events
  PASSWORD_CHANGED: 'auth.password.changed',
  PASSWORD_RESET_REQUESTED: 'auth.password.reset_requested',
  PASSWORD_RESET_COMPLETED: 'auth.password.reset_completed',
  
  // User Management Events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_ACTIVATED: 'user.activated',
  USER_DEACTIVATED: 'user.deactivated',
  
  // Permission/Role Events
  ROLE_ASSIGNED: 'permission.role.assigned',
  ROLE_REVOKED: 'permission.role.revoked',
  PERMISSION_GRANTED: 'permission.granted',
  PERMISSION_REVOKED: 'permission.revoked',
  
  // Appointment Events
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_UPDATED: 'appointment.updated',
  APPOINTMENT_DELETED: 'appointment.deleted',
  APPOINTMENT_TRANSFERRED: 'appointment.transferred',
  
  // Delegation Events
  DELEGATION_CREATED: 'delegation.created',
  DELEGATION_REVOKED: 'delegation.revoked',
  
  // Data Access Events
  SENSITIVE_DATA_ACCESSED: 'data.sensitive.accessed',
  SENSITIVE_DATA_EXPORTED: 'data.sensitive.exported',
  
  // Security Events
  UNAUTHORIZED_ACCESS_ATTEMPT: 'security.unauthorized_access',
  CSRF_VIOLATION: 'security.csrf_violation',
  RATE_LIMIT_EXCEEDED: 'security.rate_limit_exceeded',
} as const;

/**
 * Resource Types
 */
export const AuditResourceType = {
  USER: 'user',
  APPOINTMENT: 'appointment',
  DELEGATION: 'delegation',
  ROLE: 'role',
  PERMISSION: 'permission',
  OC: 'oc',
  COURSE: 'course',
  OFFERING: 'course_offering',
  SUBJECT: 'subject',
  INSTRUCTOR: 'instructor',
  PLATOON: 'platoon',
  POSITION: 'position',
  SIGNUP_REQUEST: 'signup_request',
} as const;

/**
 * Extract client IP from request
 */
function getClientIp(req: NextRequest | Request): string {
  if ('headers' in req && typeof req.headers.get === 'function') {
    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }
    const realIp = req.headers.get('x-real-ip');
    if (realIp) {
      return realIp.trim();
    }
  }
  return '127.0.0.1';
}

/**
 * Extract user agent from request
 */
function getUserAgent(req: NextRequest | Request): string | null {
  if ('headers' in req && typeof req.headers.get === 'function') {
    return req.headers.get('user-agent');
  }
  return null;
}

/**
 * Core audit logging function
 */
export async function createAuditLog(params: {
  actorUserId?: string | null;
  eventType: string;
  resourceType: string;
  resourceId?: string | null;
  description?: string | null;
  metadata?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  request?: NextRequest | Request;
}) {
  try {
    const ipAddress = params.ipAddress ?? (params.request ? getClientIp(params.request) : null);
    const userAgent = params.userAgent ?? (params.request ? getUserAgent(params.request) : null);

    await db.insert(auditLogs).values({
      actorUserId: params.actorUserId ?? null,
      eventType: params.eventType,
      resourceType: params.resourceType,
      resourceId: params.resourceId ?? null,
      description: params.description ?? null,
      metadata: params.metadata ?? null,
      ipAddr: ipAddress,
      userAgent: userAgent,
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not break the application
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Helper: Log successful login
 */
export async function logLoginSuccess(params: {
  userId: string;
  username: string;
  appointmentId: string;
  request: NextRequest | Request;
}) {
  await createAuditLog({
    actorUserId: params.userId,
    eventType: AuditEventType.LOGIN_SUCCESS,
    resourceType: AuditResourceType.USER,
    resourceId: params.userId,
    description: `User ${params.username} logged in successfully`,
    metadata: {
      username: params.username,
      appointmentId: params.appointmentId,
    },
    request: params.request,
  });
}

/**
 * Helper: Log failed login
 */
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
    request: params.request,
  });
}

/**
 * Helper: Log logout
 */
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
    metadata: {
      username: params.username,
    },
    request: params.request,
  });
}

/**
 * Helper: Log account locked
 */
export async function logAccountLocked(params: {
  userId: string;
  username: string;
  failedAttempts: number;
  lockedUntil: Date;
  request: NextRequest | Request;
}) {
  await createAuditLog({
    actorUserId: null, // System action
    eventType: AuditEventType.ACCOUNT_LOCKED,
    resourceType: AuditResourceType.USER,
    resourceId: params.userId,
    description: `Account locked for user ${params.username} after ${params.failedAttempts} failed login attempts`,
    metadata: {
      username: params.username,
      failedAttempts: params.failedAttempts,
      lockedUntil: params.lockedUntil.toISOString(),
    },
    request: params.request,
  });
}

/**
 * Helper: Log account unlocked
 */
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
    request: params.request,
  });
}

/**
 * Helper: Log password change
 */
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
    request: params.request,
  });
}

/**
 * Helper: Log user created
 */
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
    request: params.request,
  });
}

/**
 * Helper: Log user updated
 */
export async function logUserUpdated(params: {
  userId: string;
  username: string;
  updatedBy: string;
  changes: Record<string, any>;
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
      changes: params.changes,
    },
    request: params.request,
  });
}

/**
 * Helper: Log user deleted
 */
export async function logUserDeleted(params: {
  userId: string;
  username: string;
  deletedBy: string;
  request?: NextRequest | Request;
}) {
  await createAuditLog({
    actorUserId: params.deletedBy,
    eventType: AuditEventType.USER_DELETED,
    resourceType: AuditResourceType.USER,
    resourceId: params.userId,
    description: `User ${params.username} deleted`,
    metadata: {
      username: params.username,
      deletedBy: params.deletedBy,
    },
    request: params.request,
  });
}

/**
 * Helper: Log appointment created
 */
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
    request: params.request,
  });
}

/**
 * Helper: Log appointment updated
 */
export async function logAppointmentUpdated(params: {
  appointmentId: string;
  changes: Record<string, any>;
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
      changes: params.changes,
      updatedBy: params.updatedBy,
    },
    request: params.request,
  });
}

/**
 * Helper: Log unauthorized access attempt
 */
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
    metadata: {
      reason: params.reason,
    },
    request: params.request,
  });
}

/**
 * Helper: Log CSRF violation
 */
export async function logCsrfViolation(params: {
  userId?: string | null;
  request: NextRequest | Request;
}) {
  await createAuditLog({
    actorUserId: params.userId ?? null,
    eventType: AuditEventType.CSRF_VIOLATION,
    resourceType: 'security',
    description: 'CSRF token validation failed',
    request: params.request,
  });
}

/**
 * Helper: Log rate limit exceeded
 */
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
    metadata: {
      limitType: params.limitType,
    },
    request: params.request,
  });
}

