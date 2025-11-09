// src/lib/validation.ts
// SECURITY FIX: Input validation helpers
import {
  sanitizeUsername,
  sanitizeEmail,
  sanitizePhone,
  sanitizeUuid,
  sanitizePlainText,
} from './sanitize';

/**
 * Validation result type
 */
export type ValidationResult = {
  valid: boolean;
  error?: string;
  sanitized?: any;
};

/**
 * Validate username
 * @param username - The username to validate
 * @returns Validation result
 */
export function validateUsername(username: string | null | undefined): ValidationResult {
  if (!username) {
    return { valid: false, error: 'Username is required' };
  }
  
  const sanitized = sanitizeUsername(username);
  
  if (sanitized.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  
  if (sanitized.length > 50) {
    return { valid: false, error: 'Username must be at most 50 characters' };
  }
  
  if (!/^[a-zA-Z0-9_.-]+$/.test(sanitized)) {
    return { valid: false, error: 'Username can only contain letters, numbers, underscore, hyphen, and dot' };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate email
 * @param email - The email to validate
 * @returns Validation result
 */
export function validateEmail(email: string | null | undefined): ValidationResult {
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }
  
  const sanitized = sanitizeEmail(email);
  
  if (!sanitized) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  if (sanitized.length > 255) {
    return { valid: false, error: 'Email must be at most 255 characters' };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate phone number
 * @param phone - The phone number to validate
 * @returns Validation result
 */
export function validatePhone(phone: string | null | undefined): ValidationResult {
  if (!phone) {
    return { valid: false, error: 'Phone number is required' };
  }
  
  const sanitized = sanitizePhone(phone);
  
  if (sanitized.length < 10) {
    return { valid: false, error: 'Phone number must be at least 10 characters' };
  }
  
  if (sanitized.length > 20) {
    return { valid: false, error: 'Phone number must be at most 20 characters' };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate UUID
 * @param uuid - The UUID to validate
 * @returns Validation result
 */
export function validateUuid(uuid: string | null | undefined): ValidationResult {
  if (!uuid) {
    return { valid: false, error: 'UUID is required' };
  }
  
  const sanitized = sanitizeUuid(uuid);
  
  if (!sanitized) {
    return { valid: false, error: 'Invalid UUID format' };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate password strength
 * @param password - The password to validate
 * @returns Validation result
 */
export function validatePassword(password: string | null | undefined): ValidationResult {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  
  if (password.length > 128) {
    return { valid: false, error: 'Password must be at most 128 characters' };
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  
  // Check for at least one digit
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one digit' };
  }
  
  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character' };
  }
  
  return { valid: true, sanitized: password };
}

/**
 * Validate text field
 * @param text - The text to validate
 * @param minLength - Minimum length
 * @param maxLength - Maximum length
 * @param fieldName - Name of the field for error messages
 * @returns Validation result
 */
export function validateTextField(
  text: string | null | undefined,
  minLength: number = 1,
  maxLength: number = 1000,
  fieldName: string = 'Field'
): ValidationResult {
  if (!text) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  const sanitized = sanitizePlainText(text);
  
  if (sanitized.length < minLength) {
    return { valid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }
  
  if (sanitized.length > maxLength) {
    return { valid: false, error: `${fieldName} must be at most ${maxLength} characters` };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate array of UUIDs
 * @param uuids - Array of UUIDs to validate
 * @returns Validation result
 */
export function validateUuidArray(uuids: any): ValidationResult {
  if (!Array.isArray(uuids)) {
    return { valid: false, error: 'Must be an array' };
  }
  
  const sanitized: string[] = [];
  
  for (const uuid of uuids) {
    const result = validateUuid(uuid);
    if (!result.valid) {
      return { valid: false, error: `Invalid UUID in array: ${result.error}` };
    }
    sanitized.push(result.sanitized!);
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate date string
 * @param dateStr - The date string to validate
 * @returns Validation result
 */
export function validateDate(dateStr: string | null | undefined): ValidationResult {
  if (!dateStr) {
    return { valid: false, error: 'Date is required' };
  }
  
  const date = new Date(dateStr);
  
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }
  
  return { valid: true, sanitized: date.toISOString() };
}

/**
 * Validate enum value
 * @param value - The value to validate
 * @param allowedValues - Array of allowed values
 * @param fieldName - Name of the field for error messages
 * @returns Validation result
 */
export function validateEnum(
  value: any,
  allowedValues: readonly any[],
  fieldName: string = 'Field'
): ValidationResult {
  if (!allowedValues.includes(value)) {
    return {
      valid: false,
      error: `${fieldName} must be one of: ${allowedValues.join(', ')}`,
    };
  }
  
  return { valid: true, sanitized: value };
}

/**
 * Validate pagination parameters
 * @param page - Page number
 * @param limit - Items per page
 * @returns Validation result
 */
export function validatePagination(
  page: any,
  limit: any
): ValidationResult {
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  
  if (isNaN(pageNum) || pageNum < 1) {
    return { valid: false, error: 'Page must be a positive integer' };
  }
  
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return { valid: false, error: 'Limit must be between 1 and 100' };
  }
  
  return {
    valid: true,
    sanitized: { page: pageNum, limit: limitNum },
  };
}

