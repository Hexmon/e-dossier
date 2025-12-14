// src\app\lib\validators.ts
import { z } from 'zod';

// password policy: tune as you like
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  // at least 1 letter and 1 number (adjust as desired)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

export const signupSchema = z.object({
  username: z.string().trim().min(3).max(64),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(255),
  phone: z.string().trim().min(3).max(32),
  rank: z.string().trim().min(1).max(64),
  password: passwordSchema,
  confirmPassword: z.string(),
  note: z.string().trim().max(500).optional(),
}).superRefine(({ password, confirmPassword }, ctx) => {
  if (password !== confirmPassword) {
    ctx.addIssue({
      path: ['confirmPassword'],
      code: z.ZodIssueCode.custom,
      message: 'Passwords do not match',
    });
  }
});

export const platoonCreateSchema = z.object({
  key: z.string().trim().min(2).max(64)
    .regex(/^[A-Z0-9_-]+$/, 'Use UPPERCASE letters, digits, _ or -'),
  name: z.string().trim().min(2).max(128),
  about: z.string().trim().max(2000).optional().nullable(),
});

export const platoonUpdateSchema = z.object({
  key: z.string().trim().min(2).max(64)
    .regex(/^[A-Z0-9_-]+$/, 'Use UPPERCASE letters, digits, _ or -')
    .optional(),
  name: z.string().trim().min(2).max(128).optional(),
  about: z.string().trim().max(2000).optional().nullable(),
  restore: z.boolean().optional(), // set true to undelete a soft-deleted platoon
}).refine((v) => Object.keys(v).some(k => k !== 'restore'), {
  message: 'Provide at least one field (key/name/about) to update',
});

export const positionCreateSchema = z.object({
  key: z.string().trim().min(2).max(64),
  displayName: z.string().trim().min(1).max(128).optional(),
  defaultScope: z.enum(['GLOBAL', 'PLATOON']),
  singleton: z.boolean().optional().default(true),
  description: z.string().optional(),
});

export const positionUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(128).optional(),
  defaultScope: z.enum(['GLOBAL', 'PLATOON']).optional(),
  singleton: z.boolean().optional(),
  description: z.string().optional(),
});

export const appointmentCreateSchema = z.object({
  userId: z.string().uuid(),
  // you can pass either positionId or positionKey; at least one required
  positionId: z.string().uuid().optional(),
  positionKey: z.string().trim().optional(),

  assignment: z.enum(['PRIMARY', 'OFFICIATING']).default('PRIMARY'),
  scopeType: z.enum(['GLOBAL', 'PLATOON']).default('GLOBAL'),
  scopeId: z.string().uuid().nullable().optional(), // required when PLATOON

  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().nullable().optional(),
  reason: z.string().optional(),
});

export const appointmentUpdateSchema = z.object({
  assignment: z.enum(['PRIMARY', 'OFFICIATING']).optional(),
  scopeType: z.enum(['GLOBAL', 'PLATOON']).optional(),
  scopeId: z.string().uuid().nullable().optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  reason: z.string().nullable().optional(),
  deletedAt: z.coerce.date().nullable().optional(),
  username: z.string().trim().min(3).max(64).optional(),
  positionName: z.string().trim().min(1).max(128).optional(),
});

export const appointmentTransferBody = z.object({
  newUserId: z.string().uuid(),
  prevEndsAt: z.string().datetime(),   // end existing at this instant
  newStartsAt: z.string().datetime(),  // start the new one at this instant
  reason: z.string().max(500).optional(),
});

// Query params for GET /appointments
export const appointmentListQuerySchema = z.object({
  active: z
    .union([z.literal('true'), z.literal('false')])
    .optional(), // active=true filters valid_during @> now()
  positionKey: z.string().trim().optional(),
  platoonKey: z.string().trim().optional(),
  userId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).max(5000).optional(),
});

export const grantSignupRequestSchema = z.object({
  positionKey: z.string().trim().min(2),             // e.g. 'PLATOON_COMMANDER' | 'ADMIN'
  scopeType: z.enum(['GLOBAL', 'PLATOON']),
  scopeId: z.string().uuid().nullable().optional(),  // required if PLATOON
  startsAt: z.string().datetime().optional(),        // default = now
  reason: z.string().trim().max(500).optional(),
  roleKeys: z.array(z.string().trim().min(1)).optional(),
});

export const rejectSignupRequestSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

// --- Users (Admin) ---
export const userQuerySchema = z.object({
  q: z.string().trim().optional(),                         // matches username/email/name/phone (ILIKE)
  isActive: z.union([z.literal('true'), z.literal('false')]).optional(),
  includeDeleted: z.union([z.literal('true'), z.literal('false')]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).max(5000).optional(),
});

export const userCreateSchema = z.object({
  username: z.string().trim().min(3).max(64),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(255),
  phone: z.string().trim().min(3).max(32),
  rank: z.string().trim().min(1).max(64),
  isActive: z.boolean().optional().default(true),
  appointId: z.string().uuid().nullable().optional(),
  password: passwordSchema.optional(),
});

export const userUpdateSchema = z.object({
  username: z.string().trim().min(3).max(64).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().toLowerCase().email().max(255).optional(),
  phone: z.string().trim().min(3).max(32).optional(),
  rank: z.string().trim().min(1).max(64).optional(),
  isActive: z.boolean().optional(),
  appointId: z.string().uuid().nullable().optional(),
  // Admin reset password
  password: passwordSchema.optional(),
  // Soft-delete / restore toggles
  deletedAt: z.coerce.date().nullable().optional(),   // you can pass null to restore
  restore: z.boolean().optional(),                    // convenience flag to undelete
}).refine(v => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });
