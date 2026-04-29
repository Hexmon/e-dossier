import { eq } from "drizzle-orm";

import { db } from "@/app/db/client";
import { dossierLockSettings } from "@/app/db/schema/auth/dossierLockSettings";
import type { DossierLockPolicy } from "@/lib/dossier-lock-policy";
import { normalizeDossierLockPolicy } from "@/lib/dossier-lock-policy";

const DEFAULT_SINGLETON_KEY = "default" as const;

const DOSSIER_LOCK_SETTINGS_SELECT = {
  id: dossierLockSettings.id,
  singletonKey: dossierLockSettings.singletonKey,
  lockPolicy: dossierLockSettings.lockPolicy,
  updatedBy: dossierLockSettings.updatedBy,
  createdAt: dossierLockSettings.createdAt,
  updatedAt: dossierLockSettings.updatedAt,
} as const;

function now() {
  return new Date();
}

function buildDefaultSettingsRecord() {
  return {
    id: "",
    singletonKey: DEFAULT_SINGLETON_KEY,
    lockPolicy: "DEFAULT",
    updatedBy: null,
    createdAt: null,
    updatedAt: null,
  };
}

export async function getDossierLockSettingsOrDefault() {
  const [existing] = await db
    .select(DOSSIER_LOCK_SETTINGS_SELECT)
    .from(dossierLockSettings)
    .where(eq(dossierLockSettings.singletonKey, DEFAULT_SINGLETON_KEY))
    .limit(1);

  const settings = existing ?? buildDefaultSettingsRecord();
  return {
    ...settings,
    lockPolicy: normalizeDossierLockPolicy(settings.lockPolicy),
  };
}

export async function getOrCreateDossierLockSettings() {
  const existing = await getDossierLockSettingsOrDefault();
  if (existing.id) {
    return existing;
  }

  const [created] = await db
    .insert(dossierLockSettings)
    .values({ singletonKey: DEFAULT_SINGLETON_KEY })
    .returning(DOSSIER_LOCK_SETTINGS_SELECT);

  return {
    ...created,
    lockPolicy: normalizeDossierLockPolicy(created.lockPolicy),
  };
}

export async function updateDossierLockSettings(input: { lockPolicy: DossierLockPolicy }, actorUserId: string) {
  const current = await getOrCreateDossierLockSettings();

  const [updated] = await db
    .update(dossierLockSettings)
    .set({
      lockPolicy: input.lockPolicy,
      updatedBy: actorUserId,
      updatedAt: now(),
    })
    .where(eq(dossierLockSettings.id, current.id))
    .returning(DOSSIER_LOCK_SETTINGS_SELECT);

  return {
    before: current,
    after: {
      ...updated,
      lockPolicy: normalizeDossierLockPolicy(updated.lockPolicy),
    },
  };
}
