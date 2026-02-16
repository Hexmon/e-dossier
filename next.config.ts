import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const minioOrigin = process.env.MINIO_USE_SSL === 'true'
  ? `https://${process.env.MINIO_ENDPOINT ?? '127.0.0.1'}:${process.env.MINIO_PORT ?? '443'}`
  : `http://${process.env.MINIO_ENDPOINT ?? '127.0.0.1'}:${process.env.MINIO_PORT ?? '9000'}`;

const prodCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
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
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
    ];
  },
};

export default nextConfig;
