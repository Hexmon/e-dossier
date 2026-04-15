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

export const hierarchyNodeReorderItemSchema = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(10_000),
});

export const hierarchyNodeReorderSchema = z.object({
  items: z
    .array(hierarchyNodeReorderItemSchema)
    .min(1, "items is required")
    .refine((items) => new Set(items.map((item) => item.id)).size === items.length, {
      message: "items contains duplicates",
    }),
});

export const functionalRoleMappingUpdateSchema = z.object({
  commanderEquivalentPositionId: z.string().uuid().nullable(),
});
