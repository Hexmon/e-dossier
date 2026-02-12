// src/lib/sanitize.ts
// SECURITY FIX: Input sanitization to prevent XSS attacks
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitization configuration for different contexts
 */
const SANITIZE_CONFIG = {
  // Strict: Remove all HTML tags, only allow plain text
  STRICT: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },
  
  // Basic: Allow basic formatting tags only
  BASIC: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p'],
    ALLOWED_ATTR: [],
  },
  
  // Rich: Allow more formatting but no scripts or dangerous elements
  RICH: {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'u', 'br', 'p', 'div', 'span',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'blockquote', 'code', 'pre',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  },
} as const;

/**
 * Sanitize a string to prevent XSS attacks
 * @param input - The input string to sanitize
 * @param level - Sanitization level: 'strict', 'basic', or 'rich'
 * @returns Sanitized string
 */
export function sanitizeHtml(
  input: string | null | undefined,
  level: 'strict' | 'basic' | 'rich' = 'strict'
): string {
  if (!input) return '';
  
  const config = level === 'strict' 
    ? SANITIZE_CONFIG.STRICT 
    : level === 'basic' 
    ? SANITIZE_CONFIG.BASIC 
    : SANITIZE_CONFIG.RICH;
  
  return DOMPurify.sanitize(input, config as any) as unknown as string;
}

/**
 * Sanitize plain text (removes all HTML)
 * @param input - The input string
 * @returns Plain text with all HTML removed
 */
export function sanitizePlainText(input: string | null | undefined): string {
  return sanitizeHtml(input, 'strict');
}

/**
 * Sanitize a username (alphanumeric, underscore, hyphen only)
 * @param input - The username to sanitize
 * @returns Sanitized username
 */
export function sanitizeUsername(input: string | null | undefined): string {
  if (!input) return '';
  // Allow only alphanumeric, underscore, hyphen, and dot
  return input.replace(/[^a-zA-Z0-9_.-]/g, '');
}

/**
 * Sanitize an email address
 * @param input - The email to sanitize
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(input: string | null | undefined): string {
  if (!input) return '';
  // Basic email validation and sanitization
  const trimmed = input.trim().toLowerCase();
  // Remove any HTML tags
  const cleaned = sanitizePlainText(trimmed);
  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
    return '';
  }
  return cleaned;
}

/**
 * Sanitize a phone number (digits, spaces, hyphens, parentheses, plus only)
 * @param input - The phone number to sanitize
 * @returns Sanitized phone number
 */
export function sanitizePhone(input: string | null | undefined): string {
  if (!input) return '';
  // Allow only digits, spaces, hyphens, parentheses, and plus
  return input.replace(/[^0-9\s\-()+ ]/g, '');
}

/**
 * Sanitize a URL
 * @param input - The URL to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(input: string | null | undefined): string {
  if (!input) return '';
  
  try {
    const url = new URL(input);
    // Only allow http, https, and mailto protocols
    if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) {
      return '';
    }
    return url.toString();
  } catch {
    return '';
  }
}

/**
 * Sanitize a UUID
 * @param input - The UUID to sanitize
 * @returns Sanitized UUID or empty string if invalid
 */
export function sanitizeUuid(input: string | null | undefined): string {
  if (!input) return '';
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const cleaned = input.trim().toLowerCase();
  return uuidRegex.test(cleaned) ? cleaned : '';
}

/**
 * Sanitize a number
 * @param input - The input to sanitize
 * @returns Number or null if invalid
 */
export function sanitizeNumber(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const num = typeof input === 'number' ? input : parseFloat(input);
  return isNaN(num) ? null : num;
}

/**
 * Sanitize an integer
 * @param input - The input to sanitize
 * @returns Integer or null if invalid
 */
export function sanitizeInteger(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const num = typeof input === 'number' ? input : parseInt(input, 10);
  return isNaN(num) ? null : num;
}

/**
 * Sanitize a boolean
 * @param input - The input to sanitize
 * @returns Boolean value
 */
export function sanitizeBoolean(input: any): boolean {
  if (typeof input === 'boolean') return input;
  if (typeof input === 'string') {
    const lower = input.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  return Boolean(input);
}

/**
 * Sanitize an object by applying sanitization to all string values
 * @param obj - The object to sanitize
 * @param level - Sanitization level for string values
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  level: 'strict' | 'basic' | 'rich' = 'strict'
): T {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeHtml(value, level);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeHtml(item, level) : item
      );
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value, level);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

/**
 * Sanitize search query input
 * @param input - The search query
 * @returns Sanitized search query
 */
export function sanitizeSearchQuery(input: string | null | undefined): string {
  if (!input) return '';
  // Remove HTML and limit length
  const cleaned = sanitizePlainText(input);
  // Limit to 200 characters
  return cleaned.slice(0, 200);
}

/**
 * Sanitize SQL LIKE pattern (escape special characters)
 * @param input - The input pattern
 * @returns Escaped pattern safe for SQL LIKE
 */
export function sanitizeSqlLikePattern(input: string | null | undefined): string {
  if (!input) return '';
  // Escape special SQL LIKE characters: %, _, \
  return input.replace(/[%_\\]/g, '\\$&');
}

/**
 * Validate and sanitize file name
 * @param input - The file name
 * @returns Sanitized file name or empty string if invalid
 */
export function sanitizeFileName(input: string | null | undefined): string {
  if (!input) return '';
  // Remove path separators and dangerous characters
  const cleaned = input.replace(/[/\\:*?"<>|]/g, '');
  // Remove leading/trailing dots and spaces
  return cleaned.replace(/^[.\s]+|[.\s]+$/g, '');
}

/**
 * Sanitize markdown content (allow basic markdown but prevent XSS)
 * @param input - The markdown content
 * @returns Sanitized markdown
 */
export function sanitizeMarkdown(input: string | null | undefined): string {
  if (!input) return '';
  // First sanitize as HTML with rich config
  const sanitized = sanitizeHtml(input, 'rich');
  // Additional markdown-specific sanitization can be added here
  return sanitized;
}

/**
 * Escape HTML entities
 * @param input - The input string
 * @returns String with HTML entities escaped
 */
export function escapeHtml(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, "&apos;");
}

/**
 * Sanitize JSON string
 * @param input - The JSON string
 * @returns Parsed and sanitized object or null if invalid
 */
export function sanitizeJson(input: string | null | undefined): any {
  if (!input) return null;
  try {
    const parsed = JSON.parse(input);
    // Sanitize all string values in the parsed object
    return sanitizeObject(parsed);
  } catch {
    return null;
  }
}
