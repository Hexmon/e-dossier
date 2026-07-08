import type { NextRequest } from "next/server";
import { getStorageConfig } from "@/app/lib/storage";

export const runtime = "nodejs";

type MediaRouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

const ALLOWED_METHODS = "GET, HEAD, PUT, OPTIONS";
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function toOrigin(value?: string | null) {
  const raw = value?.trim();
  if (!raw) return null;

  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function getAllowedOrigins() {
  const configured = (process.env.MINIO_BROWSER_ORIGINS ?? "")
    .split(/[,\s]+/)
    .map(toOrigin)
    .filter((origin): origin is string => Boolean(origin));

  const derived = [
    toOrigin(process.env.NEXT_PUBLIC_API_BASE_URL),
    toOrigin(process.env.MINIO_PUBLIC_URL),
  ].filter((origin): origin is string => Boolean(origin));

  return new Set([...configured, ...derived]);
}

function applyCorsHeaders(req: Request, headers: Headers) {
  const origin = req.headers.get("origin");
  if (!origin) return;

  if (!getAllowedOrigins().has(origin)) return;

  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  headers.set(
    "Access-Control-Allow-Headers",
    req.headers.get("access-control-request-headers") || "content-type"
  );
  headers.set("Access-Control-Max-Age", "300");
  headers.append("Vary", "Origin");
}

function joinUrlPath(basePath: string, childPath: string) {
  const base = basePath.replace(/\/+$/, "");
  const child = childPath.replace(/^\/+/, "");
  if (!child) return base || "/";
  if (!base || base === "/") return `/${child}`;
  return `${base}/${child}`;
}

async function getMediaObjectPath(req: Request, context: MediaRouteContext) {
  const params = await context.params;
  const requestPath = new URL(req.url).pathname;
  if (requestPath.startsWith("/media/")) {
    return requestPath.slice("/media/".length);
  }

  const path = params.path ?? [];
  return path.map(encodeURIComponent).join("/");
}

function buildTargetUrl(req: Request, objectPath: string) {
  const config = getStorageConfig();
  const requestUrl = new URL(req.url);
  const targetUrl = new URL(config.endpoint);
  targetUrl.pathname = joinUrlPath(targetUrl.pathname, objectPath);
  targetUrl.search = requestUrl.search;
  return targetUrl;
}

function buildForwardHeaders(req: Request) {
  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  const contentLength = req.headers.get("content-length");

  if (contentType) headers.set("content-type", contentType);
  if (contentLength) headers.set("content-length", contentLength);

  return headers;
}

function buildResponseHeaders(req: Request, upstreamHeaders: Headers) {
  const headers = new Headers();

  for (const [key, value] of upstreamHeaders.entries()) {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) continue;
    headers.set(key, value);
  }

  applyCorsHeaders(req, headers);
  return headers;
}

async function proxyMediaRequest(req: NextRequest, context: MediaRouteContext) {
  const method = req.method.toUpperCase();
  if (!ALLOWED_METHODS.split(", ").includes(method)) {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: ALLOWED_METHODS },
    });
  }

  const objectPath = await getMediaObjectPath(req, context);
  if (!objectPath) {
    return new Response("Missing media object path", { status: 400 });
  }

  const targetUrl = buildTargetUrl(req, objectPath);
  const hasRequestBody = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  const upstream = await fetch(targetUrl.toString(), {
    method,
    headers: buildForwardHeaders(req),
    body: hasRequestBody ? req.body : undefined,
    duplex: hasRequestBody ? "half" : undefined,
    redirect: "manual",
  } as RequestInit & { duplex?: "half" });

  return new Response(method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: buildResponseHeaders(req, upstream.headers),
  });
}

export async function OPTIONS(req: NextRequest) {
  const headers = new Headers({
    Allow: ALLOWED_METHODS,
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": req.headers.get("access-control-request-headers") || "content-type",
    "Access-Control-Max-Age": "300",
  });
  applyCorsHeaders(req, headers);
  return new Response(null, { status: 204, headers });
}

export const GET = proxyMediaRequest;
export const HEAD = proxyMediaRequest;
export const PUT = proxyMediaRequest;
