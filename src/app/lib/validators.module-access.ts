import { z } from "zod";

export const moduleAccessSettingsSchema = z.object({
  adminCanAccessDossier: z.boolean(),
  adminCanAccessBulkUpload: z.boolean(),
  adminCanAccessReports: z.boolean(),
});

export type ModuleAccessSettingsInput = z.infer<typeof moduleAccessSettingsSchema>;
