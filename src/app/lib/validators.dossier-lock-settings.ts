import { z } from "zod";

export const dossierLockSettingsSchema = z.object({
  lockPolicy: z.enum(["DEFAULT", "FREEZE_ALL", "UNFREEZE_ALL"]),
});

export type DossierLockSettingsInput = z.infer<typeof dossierLockSettingsSchema>;
