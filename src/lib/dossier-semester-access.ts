type SemesterLockBypassParams = {
  roles?: string[] | null;
  position?: string | null;
};

export function canBypassDossierSemesterLock({
  roles,
  position,
}: SemesterLockBypassParams) {
  if (Array.isArray(roles) && roles.some((role) => role === "ADMIN" || role === "SUPER_ADMIN")) {
    return true;
  }

  return position === "ADMIN" || position === "SUPER_ADMIN";
}
