import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export const DATABASE_UNAVAILABLE_MESSAGE =
  'Database is temporarily unavailable. Please try again after the service is restored.';
export const STORAGE_UNAVAILABLE_MESSAGE =
  'File storage is unavailable. Check MinIO/storage configuration.';

export class ApiError extends Error {
  status: number;
  code: string;
  extras?: Record<string, unknown>;

  // order kept friendly: (status, message, code?, extras?)
  constructor(status: number, message = 'Error', code = 'error', extras?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.extras = extras;
  }
}

/** Generic responder */
function respond(status: number, payload: unknown, init?: ResponseInit) {
  return NextResponse.json(payload, { status, ...(init ?? {}) });
}

function envelope(
  status: number,
  code: string,
  message?: string,
  extras?: object,
  init?: ResponseInit
) {
  return respond(
    status,
    { status, ok: false, error: code, message, ...(extras ?? {}) }, // UPDATED
    init
  );
}

/** Success helpers also include `status` for consistency */
// UPDATED: include `status` in OK body
function ok(data?: unknown, init?: ResponseInit) {
  const body =
    typeof data === 'object' && data !== null
      ? { status: 200, ok: true, ...(data as object) } // UPDATED
      : { status: 200, ok: true }; // UPDATED
  return respond(200, body, init);
}

// UPDATED: include `status` in Created body
function created(data?: unknown, init?: ResponseInit) {
  const body =
    typeof data === 'object' && data !== null
      ? { status: 201, ok: true, ...(data as object) } // UPDATED
      : { status: 201, ok: true }; // UPDATED
  return respond(201, body, init);
}

function noContent(init?: ResponseInit) {
  return new NextResponse(null, { status: 204, ...(init ?? {}) });
}

function badRequest(messageText?: string, extras?: object, init?: ResponseInit) {
  return envelope(400, 'bad_request', messageText ?? 'Bad request', extras, init);
}

/**
 * Unauthorized helper adds WWW-Authenticate header (useful for clients & tools)
 */
// UPDATED: add WWW-Authenticate header + status in body (via envelope)
function unauthorized(messageText?: string, extras?: object, init?: ResponseInit) {
  const headers: HeadersInit = {
    'WWW-Authenticate': 'Bearer realm="api", error="invalid_token"', // UPDATED
    ...(init?.headers ?? {}),
  };
  return envelope(401, 'unauthorized', messageText ?? 'Unauthorized', extras, { ...init, headers }); // UPDATED
}

function forbidden(messageText?: string, extras?: object, init?: ResponseInit) {
  return envelope(403, 'forbidden', messageText ?? 'Forbidden', extras, init);
}

function notFound(messageText?: string, extras?: object, init?: ResponseInit) {
  return envelope(404, 'not_found', messageText ?? 'Not found', extras, init);
}

function conflict(messageText?: string, extras?: object, init?: ResponseInit) {
  return envelope(409, 'conflict', messageText ?? 'Conflict', extras, init);
}

function unprocessable(messageText?: string, extras?: object, init?: ResponseInit) {
  return envelope(422, 'unprocessable_entity', messageText ?? 'Unprocessable entity', extras, init);
}

function serverError(messageText?: string, extras?: object, init?: ResponseInit) {
  return envelope(500, 'server_error', messageText ?? 'Internal server error', extras, init);
}

function serviceUnavailable(messageText?: string, extras?: object, init?: ResponseInit) {
  return envelope(
    503,
    'service_unavailable',
    messageText ?? DATABASE_UNAVAILABLE_MESSAGE,
    { retryable: true, service: 'database', ...(extras ?? {}) },
    init
  );
}

/** Optional helpers */
export const isPgUniqueViolation = (e: unknown) =>
  typeof e === 'object' &&
  e !== null &&
  (((e as any).code === '23505') || ((e as any).cause?.code === '23505'));

const isZod = (e: unknown): e is ZodError =>
  e instanceof ZodError ||
  (
    typeof e === 'object' &&
    e !== null &&
    (e as { name?: unknown }).name === 'ZodError' &&
    Array.isArray((e as { issues?: unknown }).issues) &&
    typeof (e as { flatten?: unknown }).flatten === 'function'
  );

const DATABASE_UNAVAILABLE_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  '08000',
  '08001',
  '08003',
  '08004',
  '08006',
  '08007',
  '53300',
  '57P03',
]);

export function isDatabaseUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const visited = new Set<unknown>();
  const queue: Array<Record<string, unknown>> = [error as Record<string, unknown>];

  while (queue.length) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }
    visited.add(current);

    const code = current.code;
    if (typeof code === 'string' && DATABASE_UNAVAILABLE_CODES.has(code)) {
      return true;
    }

    const errno = current.errno;
    if (typeof errno === 'string' && DATABASE_UNAVAILABLE_CODES.has(errno)) {
      return true;
    }

    const message = typeof current.message === 'string' ? current.message.toLowerCase() : '';
    if (
      message.includes('connect econnrefused') ||
      message.includes('connection terminated') ||
      message.includes('connection timeout') ||
      message.includes('database system is starting up') ||
      message.includes('failed to connect')
    ) {
      return true;
    }

    const cause = current.cause;
    if (cause && typeof cause === 'object') {
      queue.push(cause as Record<string, unknown>);
    }
  }

  return false;
}

function isStorageServiceError(error: unknown): error is {
  service: 'storage';
  retryable?: boolean;
  message?: string;
} {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { service?: unknown }).service === 'storage'
  );
}

/** Centralized error -> response mapper (use in catch blocks) */
export function handleApiError(err: unknown) {
  if (err instanceof ApiError) {
    return envelope(err.status, err.code ?? 'error', err.message, err.extras);
  }
  if (isZod(err)) {
    // Keep your earlier pattern: issues under extras
    return badRequest('Validation failed', { issues: (err as ZodError).flatten() });
  }
  if (isPgUniqueViolation(err)) {
    return conflict('Unique constraint violated', {
      detail: (err as any).detail ?? (err as any).cause?.detail,
      constraint: (err as any).constraint ?? (err as any).cause?.constraint,
    });
  }
  if (isStorageServiceError(err)) {
    console.error('[API ERROR]', err);
    return serviceUnavailable(err.message || STORAGE_UNAVAILABLE_MESSAGE, {
      retryable: err.retryable ?? true,
      service: 'storage',
    });
  }
  if (isDatabaseUnavailableError(err)) {
    console.error('[API ERROR]', err);
    return serviceUnavailable();
  }
  // last resort
  console.error('[API ERROR]', err);
  return serverError('Unexpected error');
}

export const json = {
  ok,
  created,
  noContent,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessable,
  serviceUnavailable,
  serverError,
};
