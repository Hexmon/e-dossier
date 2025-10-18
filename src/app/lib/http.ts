import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

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

/** Optional helpers */
export const isPgUniqueViolation = (e: unknown) =>
  typeof e === 'object' && e !== null && (e as any).code === '23505';

const isZod = (e: unknown): e is ZodError => e instanceof ZodError;

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
    return conflict('Unique constraint violated', { detail: (err as any).detail });
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
  serverError,
};
