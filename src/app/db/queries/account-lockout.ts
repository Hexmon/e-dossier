// src/app/db/queries/account-lockout.ts
// SECURITY FIX: Account lockout mechanism after failed login attempts
import { db } from '../client';
import { loginAttempts, accountLockouts } from '../schema/auth/login_attempts';
import { users } from '../schema/auth/users';
import { eq, and, gte, desc, sql } from 'drizzle-orm';

// Configuration
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;
const FAILED_ATTEMPTS_WINDOW_MINUTES = 15;

/**
 * Record a login attempt (successful or failed)
 * @param data - Login attempt data
 * @returns Created login attempt record
 */
export async function recordLoginAttempt(data: {
  userId?: string;
  username: string;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
}) {
  const [attempt] = await db
    .insert(loginAttempts)
    .values({
      userId: data.userId ?? null,
      username: data.username,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent ?? null,
      success: data.success,
      failureReason: data.failureReason ?? null,
    })
    .returning();

  return attempt;
}

/**
 * Get recent failed login attempts for a user
 * @param username - Username to check
 * @param windowMinutes - Time window in minutes (default: 15)
 * @returns Array of failed login attempts
 */
export async function getRecentFailedAttempts(
  username: string,
  windowMinutes: number = FAILED_ATTEMPTS_WINDOW_MINUTES
) {
  const cutoffTime = new Date(Date.now() - windowMinutes * 60 * 1000);

  return await db
    .select()
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.username, username.toLowerCase()),
        eq(loginAttempts.success, false),
        gte(loginAttempts.attemptedAt, cutoffTime)
      )
    )
    .orderBy(desc(loginAttempts.attemptedAt));
}

/**
 * Check if an account is currently locked
 * @param userId - User ID to check
 * @returns Lockout record if account is locked, null otherwise
 */
export async function isAccountLocked(userId: string) {
  const now = new Date();

  const [lockout] = await db
    .select()
    .from(accountLockouts)
    .where(
      and(
        eq(accountLockouts.userId, userId),
        eq(accountLockouts.unlocked, false),
        gte(accountLockouts.lockedUntil, now)
      )
    )
    .orderBy(desc(accountLockouts.lockedAt))
    .limit(1);

  return lockout ?? null;
}

/**
 * Lock an account after too many failed attempts
 * @param userId - User ID to lock
 * @param failedAttempts - Number of failed attempts
 * @param ipAddress - IP address of the failed attempts
 * @param durationMinutes - Lockout duration in minutes (default: 30)
 * @returns Created lockout record
 */
export async function lockAccount(
  userId: string,
  failedAttempts: number,
  ipAddress: string,
  durationMinutes: number = LOCKOUT_DURATION_MINUTES
) {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + durationMinutes * 60 * 1000);

  const [lockout] = await db
    .insert(accountLockouts)
    .values({
      userId,
      lockedAt: now,
      lockedUntil,
      failedAttempts,
      ipAddress,
      unlocked: false,
      reason: `Account locked after ${failedAttempts} failed login attempts`,
    })
    .returning();

  return lockout;
}

/**
 * Unlock an account manually (by admin)
 * @param lockoutId - Lockout record ID
 * @param unlockedBy - User ID of admin who unlocked the account
 * @returns Updated lockout record
 */
export async function unlockAccount(lockoutId: string, unlockedBy: string) {
  const [lockout] = await db
    .update(accountLockouts)
    .set({
      unlocked: true,
      unlockedAt: new Date(),
      unlockedBy,
    })
    .where(eq(accountLockouts.id, lockoutId))
    .returning();

  return lockout;
}

/**
 * Clear old login attempts (cleanup job)
 * @param daysToKeep - Number of days to keep records (default: 90)
 * @returns Number of deleted records
 */
export async function clearOldLoginAttempts(daysToKeep: number = 90) {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

  const result = await db
    .delete(loginAttempts)
    .where(sql`${loginAttempts.attemptedAt} < ${cutoffDate}`);

  return result;
}

/**
 * Get login attempt statistics for a user
 * @param userId - User ID
 * @param days - Number of days to look back (default: 30)
 * @returns Statistics object
 */
export async function getLoginAttemptStats(userId: string, days: number = 30) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const attempts = await db
    .select()
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.userId, userId),
        gte(loginAttempts.attemptedAt, cutoffDate)
      )
    );

  const successful = attempts.filter((a) => a.success).length;
  const failed = attempts.filter((a) => !a.success).length;

  return {
    total: attempts.length,
    successful,
    failed,
    successRate: attempts.length > 0 ? (successful / attempts.length) * 100 : 0,
  };
}

/**
 * Check if account should be locked and lock it if necessary
 * @param username - Username to check
 * @param userId - User ID (if known)
 * @param ipAddress - IP address of the attempt
 * @returns Lockout record if account was locked, null otherwise
 */
export async function checkAndLockAccount(
  username: string,
  userId: string | null,
  ipAddress: string
) {
  // Get recent failed attempts
  const failedAttempts = await getRecentFailedAttempts(username);

  // If we have enough failed attempts and we know the user ID, lock the account
  if (failedAttempts.length >= MAX_FAILED_ATTEMPTS && userId) {
    // Check if already locked
    const existingLockout = await isAccountLocked(userId);
    if (existingLockout) {
      return existingLockout;
    }

    // Lock the account
    return await lockAccount(userId, failedAttempts.length, ipAddress);
  }

  return null;
}

/**
 * Clear failed attempts after successful login
 * @param username - Username
 */
export async function clearFailedAttempts(username: string) {
  // We don't actually delete them (for audit purposes)
  // They will naturally age out based on the time window
  // This function is here for future use if needed
  return;
}

