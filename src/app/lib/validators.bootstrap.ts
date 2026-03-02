import { z } from 'zod';

export const orgTemplateModuleSchema = z.enum(['pt', 'camp', 'platoon', 'appointment']);
export const ptTemplateProfileSchema = z.enum(['default']);

export const applyOrgTemplateSchema = z.object({
  module: orgTemplateModuleSchema,
  profile: ptTemplateProfileSchema.optional(),
  dryRun: z.boolean().optional(),
});

export type ApplyOrgTemplateDto = z.infer<typeof applyOrgTemplateSchema>;
