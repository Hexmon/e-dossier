export const DOSSIER_LOCK_POLICIES = ["DEFAULT", "FREEZE_ALL", "UNFREEZE_ALL"] as const;

export type DossierLockPolicy = (typeof DOSSIER_LOCK_POLICIES)[number];

export function normalizeDossierLockPolicy(value: string | null | undefined): DossierLockPolicy {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (DOSSIER_LOCK_POLICIES.includes(normalized as DossierLockPolicy)) {
    return normalized as DossierLockPolicy;
  }

  return "DEFAULT";
}

export function isDossierGloballyFrozen(policy: DossierLockPolicy) {
  return policy === "FREEZE_ALL";
}

export function isDossierGloballyUnlocked(policy: DossierLockPolicy) {
  return policy === "UNFREEZE_ALL";
}
