import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const CSP_PROD = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "block-all-mixed-content",
  "upgrade-insecure-requests",
].join("; ");

// In development, relax CSP to allow Next.js dev inline scripts/HMR while still
// keeping a reasonable baseline. This avoids blank screens caused by blocking
// Turbopack/React Server Components dev scripts.
const CSP_DEV = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  // Allow dev tooling (HMR, RSC transport, etc.) to open connections freely.
  "connect-src *",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders: { key: string; value: string }[] = [
  {
    key: "Content-Security-Policy",
    value: isProd ? CSP_PROD : CSP_DEV,
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  eslint: {
    // SECURITY FIX: Enable linting during builds to catch security issues
    ignoreDuringBuilds: false,
  },

  // SECURITY FIX: Disable X-Powered-By header to avoid exposing Next.js
  poweredByHeader: false,

  // SECURITY FIX: Add comprehensive security headers (CSP is env-specific)
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
