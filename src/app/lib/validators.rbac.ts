import { z } from 'zod';

export const rbacPermissionCreateSchema = z.object({
  key: z.string().trim().min(3).max(200),
  description: z.string().trim().max(1000).nullable().optional(),
});

export const rbacPermissionUpdateSchema = z
  .object({
    key: z.string().trim().min(3).max(200).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'Provide at least one field to update.',
  });

export const rbacMappingsUpdateSchema = z.object({
  roleId: z.string().uuid().optional(),
  positionId: z.string().uuid().optional(),
  permissionIds: z.array(z.string().uuid()).default([]),
});

export const rbacFieldRuleCreateSchema = z
  .object({
    permissionId: z.string().uuid(),
    positionId: z.string().uuid().nullable().optional(),
    roleId: z.string().uuid().nullable().optional(),
    mode: z.enum(['ALLOW', 'DENY', 'OMIT', 'MASK']),
    fields: z.array(z.string().trim().min(1)).default([]),
    note: z.string().trim().max(1000).nullable().optional(),
  })
  .refine((payload) => Boolean(payload.positionId || payload.roleId), {
    message: 'Either positionId or roleId is required.',
  });

export const rbacFieldRuleUpdateSchema = z
  .object({
    positionId: z.string().uuid().nullable().optional(),
    roleId: z.string().uuid().nullable().optional(),
    mode: z.enum(['ALLOW', 'DENY', 'OMIT', 'MASK']).optional(),
    fields: z.array(z.string().trim().min(1)).optional(),
    note: z.string().trim().max(1000).nullable().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'Provide at least one field to update.',
  });

