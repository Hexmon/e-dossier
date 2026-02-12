// src/app/lib/apiClient.ts
/* A tiny, typed API client for Next.js App Router projects.
 * - Cookies: relies on your httpOnly access_token cookie; no token juggling here.
 * - Path params: pass { path: { id: "123" } } to replace /:id or {id} in the endpoint.
 * - Query params: pass { query: { q: "hello", page: 2 } } and it auto-serializes.
 * - Body: object -> JSON; FormData/Blob/File -> sent as-is (no JSON header).
 * - Errors: throws ApiClientError with server envelope (status, error, message, extras).
 * - Works client & server (uses fetch; cookies are sent automatically on same-origin).
 */

import z from "zod";
import {
    buildLoginUrlWithNext,
    getCurrentDashboardPathWithQuery,
    storeReturnUrl,
} from "@/lib/auth-return-url";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

const DEFAULT_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://172.22.128.57";

type Primitive = string | number | boolean | null | undefined;
type QueryValue = Primitive | Primitive[];

/** Matches your server's envelope in json.ts */
export type ApiOk<T = unknown> = {
    status: number;
    ok: true;
} & T;

export const IdSchema = z.object({ id: z.string().uuid() });

export type ApiErrorEnvelope = {
    status: number;
    ok: false;
    error: string;
    message?: string;
    [k: string]: unknown;
};

export class ApiClientError extends Error {
    status: number;
    code: string;
    extras?: Record<string, unknown>;
    response?: Response;

    constructor(msg: string, status: number, code: string, extras?: Record<string, unknown>, response?: Response) {
        super(msg);
        this.name = "ApiClientError";
        this.status = status;
        this.code = code;
        this.extras = extras;
        this.response = response;
    }
}

export type ApiRequestOptions<B = unknown> = {
    /** "GET" | "POST" | ... */
    method: HttpMethod;
    /**
     * Endpoint can be absolute or relative; recommended: relative to same origin,
     * e.g. "/api/v1/users/:id" or "/api/v1/users/{id}"
     */
    endpoint: string;
    /** Path params to replace :id or {id} segments */
    path?: Record<string, string | number>;
    /** Query params automatically stringified; arrays -> repeated keys */
    query?: Record<string, QueryValue>;
    /** Body: object -> JSON; FormData/Blob/File -> streamed; undefined -> no body */
    body?: B;
    /** Extra headers (Content-Type auto-added for JSON) */
    headers?: Record<string, string>;
    /** Abort support */
    signal?: AbortSignal;
    /** Skip CSRF token fetch/header (use for login/signup/logout) */
    skipCsrf?: boolean;
    /**
     * Optional baseURL override (useful on server if you need absolute URL).
     * If omitted, a relative fetch is used and cookies still flow on same-origin.
     */
    baseURL?: string;
    skipAuth?: boolean;
};

function applyPathParams(template: string, params?: Record<string, string | number>) {
    if (!params) return template;
    // Replace `{key}` or `:key`
    let out = template;
    for (const [k, v] of Object.entries(params)) {
        const val = encodeURIComponent(String(v));
        out = out.replace(new RegExp(`:{${k}}|:${k}|{${k}}`, "g"), val);
    }
    return out;
}

function toQueryString(query?: Record<string, QueryValue>) {
    if (!query) return "";
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
        if (Array.isArray(v)) {
            for (const item of v) {
                if (item !== undefined && item !== null) usp.append(k, String(item));
            }
        } else if (v !== undefined && v !== null) {
            usp.append(k, String(v));
        }
    }
    const s = usp.toString();
    return s ? `?${s}` : "";
}

function isFormLike(x: unknown): x is FormData | Blob | File {
    return typeof Blob !== "undefined" && (x instanceof FormData || x instanceof Blob || x instanceof File);
}

let csrfToken: string | null = null;
let csrfPromise: Promise<void> | null = null;
let authRedirectInProgress = false;
const AUTH_ENDPOINT_PATHS = new Set(["/api/v1/auth/login", "/api/v1/auth/logout"]);

function getPathnameFromUrl(input: string): string | null {
    try {
        const base =
            typeof window !== "undefined" ? window.location.origin : "http://localhost";
        return new URL(input, base).pathname;
    } catch {
        return null;
    }
}

function shouldHandleUnauthorizedInBrowser(params: {
    endpoint: string;
    requestUrl: string;
    skipAuth?: boolean;
}): boolean {
    if (typeof window === "undefined" || params.skipAuth) return false;
    if (authRedirectInProgress) return false;
    if (window.location.pathname === "/login") return false;

    const endpointPath = getPathnameFromUrl(params.endpoint);
    const requestPath = getPathnameFromUrl(params.requestUrl);

    if (endpointPath && AUTH_ENDPOINT_PATHS.has(endpointPath)) return false;
    if (requestPath && AUTH_ENDPOINT_PATHS.has(requestPath)) return false;

    return true;
}

async function handleUnauthorizedInBrowser(): Promise<void> {
    if (typeof window === "undefined" || authRedirectInProgress) return;
    authRedirectInProgress = true;

    const returnUrl = getCurrentDashboardPathWithQuery();
    if (returnUrl) {
        storeReturnUrl(returnUrl);
    }

    try {
        await fetch("/api/v1/auth/logout", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
        });
    } catch {
        // Best effort only; login redirect still proceeds.
    }

    window.location.assign(buildLoginUrlWithNext(returnUrl));
}

/**
 * Ensure a CSRF token is available in the browser by performing a
 * lightweight GET to the health endpoint, which sets the cookie and
 * returns the token in the X-CSRF-Token header via middleware.
 */
async function ensureCsrfToken(baseURL?: string) {
    if (typeof window === 'undefined') return;

    if (csrfToken) return;
    if (!csrfPromise) {
        csrfPromise = (async () => {
            try {
                const healthUrl = baseURL
                    ? new URL('/api/v1/health', baseURL).toString()
                    : '/api/v1/health';

                const res = await fetch(healthUrl, {
                    method: 'GET',
                    credentials: 'include',
                });

                const headerToken = res.headers.get('X-CSRF-Token');
                if (headerToken) {
                    csrfToken = headerToken;
                }
            } catch {
                // Best-effort only; middleware will reject requests without a valid token.
            } finally {
                csrfPromise = null;
            }
        })();
    }

    await csrfPromise;
}


export async function apiRequest<T = unknown, B = unknown>(opts: ApiRequestOptions<B>): Promise<T> {
    const {
        method,
        endpoint,
        path,
        query,
        body,
        headers,
        signal,
        skipCsrf,
        skipAuth,
        baseURL,
    } = opts;

    // Build URL
    const replaced = applyPathParams(endpoint, path);
    const qs = toQueryString(query);
    const finalBase = baseURL || DEFAULT_API_BASE;
    const url = finalBase ? new URL(replaced + qs, finalBase).toString() : `${replaced}${qs}`;

    // Build init
    const init: RequestInit = {
        method,
        // Ensure cookies (httpOnly access_token) are sent on same-origin
        credentials: "include",
        signal,
        headers: { ...(headers ?? {}) },
    };

    // SECURITY FIX: Add CSRF token for state-changing requests.
    // Only on client-side (browser environment). We lazily obtain the token
    // via a lightweight GET to /api/v1/health, which the middleware uses to
    // set the CSRF cookie and return the token in the X-CSRF-Token header.
    if (typeof window !== 'undefined' && !skipCsrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
        await ensureCsrfToken(finalBase);

        if (csrfToken) {
            init.headers = {
                ...init.headers,
                'X-CSRF-Token': csrfToken,
            };
        }
    }

    // Auto content-type + body
    if (body !== undefined && body !== null) {
        if (isFormLike(body)) {
            // Let browser set proper multipart or stream headers; do not set content-type here
            (init as any).body = body as any;
        } else if (typeof body === "object") {
            init.headers = { "Content-Type": "application/json", ...(init.headers ?? {}) };
            (init as any).body = JSON.stringify(body);
        } else {
            // Primitive payloads
            init.headers = { "Content-Type": "text/plain;charset=UTF-8", ...(init.headers ?? {}) };
            (init as any).body = String(body);
        }
    }

    const res = await fetch(url, init);

    // Refresh CSRF token from response header if present
    const resCsrf = res.headers.get('X-CSRF-Token');
    if (resCsrf) {
        csrfToken = resCsrf;
    }

    // SECURITY FIX: Handle 401 Unauthorized - capture return URL and redirect to login.
    if (res.status === 401) {
        if (
            shouldHandleUnauthorizedInBrowser({
                endpoint,
                requestUrl: url,
                skipAuth,
            })
        ) {
            void handleUnauthorizedInBrowser();
        }

        throw new ApiClientError(
            'Unauthorized - Please log in',
            401,
            'unauthorized',
            {},
            res
        );
    }

    // Handle 204 (no content) quickly
    if (res.status === 204) return undefined as unknown as T;

    // Try parse JSON; if fails, throw generic
    const isJson = res.headers.get("content-type")?.includes("application/json");
    let data: any = null;
    if (isJson) {
        data = await res.json().catch(() => null);
    } else {
        const text = await res.text().catch(() => "");
        try {
            data = JSON.parse(text);
        } catch {
            data = text; // non-JSON payload
        }
    }

    // Accept ok envelopes or raw JSON
    if (res.ok) {
        // If server returns your envelope { ok:true, status, ...data }, unwrap it
        if (data && typeof data === "object" && "ok" in data && (data as any).ok === true) {
            // drop status/ok and return the rest
            const { ok, status, ...rest } = data as Record<string, unknown>;
            return rest as T;
        }
        return data as T;
    }

    // Non-OK -> normalize server error envelope
    const env: ApiErrorEnvelope | null =
        data && typeof data === "object" && "ok" in data && (data as any).ok === false
            ? (data as ApiErrorEnvelope)
            : null;

    if (env) {
        throw new ApiClientError(
            env.message ?? "Request failed",
            env.status ?? res.status,
            env.error ?? "error",
            // pass all extras (excluding known fields)
            Object.fromEntries(Object.entries(env).filter(([k]) => !["status", "ok", "error", "message"].includes(k))),
            res
        );
    }

    // Fallback: build a best-effort error
    throw new ApiClientError(
        `Request failed with ${res.status}`,
        res.status,
        "error",
        typeof data === "object" ? (data as Record<string, unknown>) : { body: data },
        res
    );
}

/* Convenience helpers */
export const api = {
    request: apiRequest,
    get: <T = unknown>(endpoint: string, opts?: Omit<ApiRequestOptions<never>, "method" | "endpoint">) =>
        apiRequest<T>({ method: "GET", endpoint, ...(opts ?? {}) }),
    delete: <T = unknown>(endpoint: string, opts?: Omit<ApiRequestOptions<never>, "method" | "endpoint">) =>
        apiRequest<T>({ method: "DELETE", endpoint, ...(opts ?? {}) }),
    post: <T = unknown, B = unknown>(endpoint: string, body?: B, opts?: Omit<ApiRequestOptions<B>, "method" | "endpoint" | "body">) =>
        apiRequest<T, B>({ method: "POST", endpoint, body: body as B, ...(opts ?? {}) }),
    put: <T = unknown, B = unknown>(endpoint: string, body?: B, opts?: Omit<ApiRequestOptions<B>, "method" | "endpoint" | "body">) =>
        apiRequest<T, B>({ method: "PUT", endpoint, body: body as B, ...(opts ?? {}) }),
    patch: <T = unknown, B = unknown>(endpoint: string, body?: B, opts?: Omit<ApiRequestOptions<B>, "method" | "endpoint" | "body">) =>
        apiRequest<T, B>({ method: "PATCH", endpoint, body: body as B, ...(opts ?? {}) }),
};
