import { z } from "zod";

export const hierarchyNodeInputSchema = z.object({
  key: z.string().trim().min(2).max(128),
  name: z.string().trim().min(1).max(256),
  nodeType: z.enum(["ROOT", "GROUP", "PLATOON"]),
  parentId: z.string().uuid().nullable().optional(),
  platoonId: z.string().uuid().nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(10_000).optional(),
});

export const hierarchyNodeUpdateSchema = hierarchyNodeInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one hierarchy field to update.",
  });

export const functionalRoleMappingUpdateSchema = z.object({
  commanderEquivalentPositionId: z.string().uuid().nullable(),
});
