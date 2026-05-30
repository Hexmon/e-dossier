import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const useStandaloneOutput = process.env.NEXT_BUILD_STANDALONE === "true";

function toOrigin(value?: string | null) {
  const raw = value?.trim().replace(/\/+$/, "");
  if (!raw) return null;

  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function normalizeMinioEndpointOrigin() {
  const endpoint = process.env.MINIO_ENDPOINT?.trim();
  if (!endpoint) return null;

  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return toOrigin(endpoint);
  }

  const useSsl = process.env.MINIO_USE_SSL === "true";
  const protocol = useSsl ? "https" : "http";
  const port = process.env.MINIO_PORT || (useSsl ? "443" : "9000");
  const hasPort = /:\d+$/.test(endpoint);
  return toOrigin(`${protocol}://${endpoint}${hasPort ? "" : `:${port}`}`);
}

function getMinioBrowserOrigins() {
  const configuredOrigins = (process.env.MINIO_BROWSER_ORIGINS ?? "")
    .split(/[,\s]+/)
    .map(toOrigin)
    .filter((origin): origin is string => Boolean(origin));

  const publicOrigin = toOrigin(process.env.MINIO_PUBLIC_URL);
  const derivedOrigins = [
    publicOrigin,
    publicOrigin ? null : normalizeMinioEndpointOrigin(),
  ].filter((origin): origin is string => Boolean(origin));

  return Array.from(new Set([...configuredOrigins, ...derivedOrigins]));
}

const minioBrowserOrigins = getMinioBrowserOrigins().join(" ");
const imgSrc = ["img-src 'self' data: blob:", minioBrowserOrigins].filter(Boolean).join(" ");
const connectSrc = ["connect-src 'self'", minioBrowserOrigins].filter(Boolean).join(" ");

const prodCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  imgSrc,
  "font-src 'self'",
  connectSrc,
  "media-src 'self'",
  "object-src 'none'",
  "child-src 'self'",
  "frame-src 'none'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join("; ");


const sharedHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const prodOnlyHeaders = [
  { key: "Content-Security-Policy", value: prodCsp },
];

const securityHeaders = isProd
  ? [...sharedHeaders, ...prodOnlyHeaders]
  : sharedHeaders;

const nextConfig: NextConfig = {
  ...(useStandaloneOutput ? { output: "standalone" as const } : {}),
  poweredByHeader: false,
  outputFileTracingIncludes: {
    '/*': [
      'docs/help/**/*',
      'public/images/**/*',
    ],
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
    ];
  },
};

export default nextConfig;
