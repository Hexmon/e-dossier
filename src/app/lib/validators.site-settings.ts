import { z } from "zod";

export const SITE_SETTINGS_IMAGE_MAX_SIZE_BYTES = 2 * 1024 * 1024;
export const SITE_SETTINGS_ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

export const sortSchema = z.enum(["asc", "desc"]).default("asc");
export const eventNewsTypeSchema = z.enum(["event", "news"]);

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const trimmedText = (min: number, max: number, field: string) =>
  z
    .string()
    .trim()
    .min(min, `${field} is required`)
    .max(max, `${field} is too long`);

const nullableText = z.union([z.string().trim().max(4096), z.null()]).optional();

export const siteSettingsUpdateSchema = z
  .object({
    logoUrl: nullableText,
    logoObjectKey: nullableText,
    heroBgUrl: nullableText,
    heroBgObjectKey: nullableText,
    heroTitle: trimmedText(2, 160, "heroTitle").optional(),
    heroDescription: trimmedText(8, 1200, "heroDescription").optional(),
    commandersSectionTitle: trimmedText(2, 160, "commandersSectionTitle").optional(),
    awardsSectionTitle: trimmedText(2, 160, "awardsSectionTitle").optional(),
    historySectionTitle: trimmedText(2, 160, "historySectionTitle").optional(),
  })
  .refine(
    (value) =>
      Object.values(value).some((entry) => entry !== undefined),
    "At least one field is required"
  );

export const logoPresignSchema = z.object({
  contentType: z.enum(SITE_SETTINGS_ALLOWED_IMAGE_TYPES),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(SITE_SETTINGS_IMAGE_MAX_SIZE_BYTES, "Logo exceeds max size"),
});

export const commanderCreateSchema = z.object({
  name: trimmedText(2, 160, "name"),
  designation: trimmedText(2, 160, "designation"),
  tenure: trimmedText(2, 120, "tenure"),
  description: trimmedText(5, 2000, "description"),
  imageUrl: nullableText,
  imageObjectKey: nullableText,
  sortOrder: z.number().int().min(0).optional(),
});

export const commanderUpdateSchema = z
  .object({
    name: trimmedText(2, 160, "name").optional(),
    designation: trimmedText(2, 160, "designation").optional(),
    tenure: trimmedText(2, 120, "tenure").optional(),
    description: trimmedText(5, 2000, "description").optional(),
    imageUrl: nullableText,
    imageObjectKey: nullableText,
    sortOrder: z.number().int().min(0).optional(),
  })
  .refine(
    (value) => Object.values(value).some((entry) => entry !== undefined),
    "At least one field is required"
  );

export const awardCreateSchema = z.object({
  title: trimmedText(2, 180, "title"),
  description: trimmedText(5, 2000, "description"),
  category: trimmedText(2, 120, "category"),
  imageUrl: nullableText,
  imageObjectKey: nullableText,
  sortOrder: z.number().int().min(0).optional(),
});

export const awardUpdateSchema = z
  .object({
    title: trimmedText(2, 180, "title").optional(),
    description: trimmedText(5, 2000, "description").optional(),
    category: trimmedText(2, 120, "category").optional(),
    imageUrl: nullableText,
    imageObjectKey: nullableText,
    sortOrder: z.number().int().min(0).optional(),
  })
  .refine(
    (value) => Object.values(value).some((entry) => entry !== undefined),
    "At least one field is required"
  );

export const awardReorderSchema = z.object({
  orderedIds: z
    .array(z.string().uuid())
    .min(1, "orderedIds is required")
    .refine((ids) => new Set(ids).size === ids.length, "orderedIds contains duplicates"),
});

export const historyCreateSchema = z.object({
  incidentDate: z.string().date("Invalid date format (YYYY-MM-DD)"),
  description: trimmedText(5, 2000, "description"),
});

export const historyUpdateSchema = z
  .object({
    incidentDate: z.string().date("Invalid date format (YYYY-MM-DD)").optional(),
    description: trimmedText(5, 2000, "description").optional(),
  })
  .refine(
    (value) => Object.values(value).some((entry) => entry !== undefined),
    "At least one field is required"
  );

export const eventNewsCreateSchema = z.object({
  date: z.string().date("Invalid date format (YYYY-MM-DD)"),
  title: trimmedText(2, 180, "title"),
  description: trimmedText(5, 2000, "description"),
  location: trimmedText(2, 200, "location"),
  type: eventNewsTypeSchema,
});

export const eventNewsUpdateSchema = z
  .object({
    date: z.string().date("Invalid date format (YYYY-MM-DD)").optional(),
    title: trimmedText(2, 180, "title").optional(),
    description: trimmedText(5, 2000, "description").optional(),
    location: trimmedText(2, 200, "location").optional(),
    type: eventNewsTypeSchema.optional(),
  })
  .refine(
    (value) => Object.values(value).some((entry) => entry !== undefined),
    "At least one field is required"
  );

export const footerCreateSchema = z.object({
  footer: trimmedText(2, 4000, "footer"),
});

export const footerUpdateSchema = z.object({
  footer: trimmedText(2, 4000, "footer"),
});

export type SiteSettingsUpdateInput = z.infer<typeof siteSettingsUpdateSchema>;
export type CommanderCreateInput = z.infer<typeof commanderCreateSchema>;
export type CommanderUpdateInput = z.infer<typeof commanderUpdateSchema>;
export type AwardCreateInput = z.infer<typeof awardCreateSchema>;
export type AwardUpdateInput = z.infer<typeof awardUpdateSchema>;
export type AwardReorderInput = z.infer<typeof awardReorderSchema>;
export type HistoryCreateInput = z.infer<typeof historyCreateSchema>;
export type HistoryUpdateInput = z.infer<typeof historyUpdateSchema>;
export type EventNewsTypeInput = z.infer<typeof eventNewsTypeSchema>;
export type EventNewsCreateInput = z.infer<typeof eventNewsCreateSchema>;
export type EventNewsUpdateInput = z.infer<typeof eventNewsUpdateSchema>;
export type FooterCreateInput = z.infer<typeof footerCreateSchema>;
export type FooterUpdateInput = z.infer<typeof footerUpdateSchema>;
