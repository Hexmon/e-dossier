// src/lib/csrf.ts
// SECURITY FIX: CSRF Protection Implementation
// Edge Runtime compatible - uses Web Crypto API instead of Node.js crypto
import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_CSRF_SECRET = 'default-csrf-secret-change-in-production';
const WEAK_CSRF_SECRETS = new Set([
  '',
  'change_me',
  'dev_change_me',
  'qa_change_me',
  DEFAULT_CSRF_SECRET,
]);

function getCsrfSecret(): string {
  const secret = process.env.CSRF_SECRET || DEFAULT_CSRF_SECRET;
  if (process.env.NODE_ENV === 'production' && WEAK_CSRF_SECRETS.has(secret.trim())) {
    throw new Error('CSRF_SECRET must be set to a strong non-default value in production.');
  }
  return secret;
}

/**
 * Generate a random token using Web Crypto API (Edge Runtime compatible)
 * @returns Random token string (base64url encoded)
 */
function generateRandomToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  // Convert to base64url (URL-safe base64)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Create HMAC signature using Web Crypto API (Edge Runtime compatible)
 * @param message - Message to sign
 * @param secret - Secret key
 * @returns Promise<string> - HMAC signature (hex encoded)
 */
async function createHmac(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a CSRF token
 * Format: randomToken.hmac(randomToken, secret)
 * @returns Promise<string> - CSRF token string
 */
export async function generateCsrfToken(): Promise<string> {
  const randomToken = generateRandomToken();
  const signature = await createHmac(randomToken, getCsrfSecret());
  return `${randomToken}.${signature}`;
}

/**
 * Verify a CSRF token
 * @param token - The token to verify
 * @returns Promise<boolean> - true if valid, false otherwise
 */
export async function verifyCsrfToken(token: string): Promise<boolean> {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [randomToken, providedSignature] = parts;
  const expectedSignature = await createHmac(randomToken, getCsrfSecret());

  // Constant-time comparison to prevent timing attacks
  if (providedSignature.length !== expectedSignature.length) return false;

  let mismatch = 0;
  for (let i = 0; i < expectedSignature.length; i++) {
    mismatch |= providedSignature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }

  return mismatch === 0;
}

/**
 * Extract CSRF token from request
 * Checks in order: X-CSRF-Token header, csrf-token header, _csrf body field
 * @param req - Next.js request object
 * @returns CSRF token string or null
 */
export function extractCsrfToken(req: NextRequest): string | null {
  // Check headers first
  const headerToken = req.headers.get('X-CSRF-Token') || req.headers.get('csrf-token');
  if (headerToken) return headerToken;

  // For form submissions, the token would be in the body
  // This will be handled by the API route itself
  return null;
}

/**
 * Set CSRF token in response cookie
 * @param res - Next.js response object
 * @param token - CSRF token to set
 */
export function setCsrfCookie(res: NextResponse, token: string): void {
  // SECURITY FIX: Store CSRF token in an HttpOnly cookie so it cannot be read by
  // malicious JavaScript, and also expose it once via the X-CSRF-Token header
  // for SPA clients (see apiClient.ts).
  res.cookies.set('csrf-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 3600, // 1 hour
  });

  // Provide the token to the client via response header; middleware merges this
  // header into the final response so the browser can read it.
  res.headers.set('X-CSRF-Token', token);
}

/**
 * Get CSRF token from request cookies
 * @param req - Next.js request object
 * @returns CSRF token string or null
 */
export function getCsrfTokenFromCookie(req: NextRequest): string | null {
  return req.cookies.get('csrf-token')?.value ?? null;
}

/**
 * Validate CSRF token from request
 * @param req - Next.js request object
 * @returns Promise<boolean> - true if valid, false otherwise
 */
export async function validateCsrfToken(req: NextRequest): Promise<boolean> {
  const token = extractCsrfToken(req);
  if (!token) return false;

  return await verifyCsrfToken(token);
}

/**
 * Check if request method requires CSRF protection
 * @param method - HTTP method
 * @returns true if CSRF protection required
 */
export function requiresCsrfProtection(method: string): boolean {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  return !safeMethods.includes(method.toUpperCase());
}
