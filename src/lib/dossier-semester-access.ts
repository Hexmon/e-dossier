type SemesterLockBypassParams = {
  roles?: string[] | null;
  position?: string | null;
};

export function hasSuperAdminAuthority({
  roles,
  position,
}: SemesterLockBypassParams) {
  if (Array.isArray(roles) && roles.includes("SUPER_ADMIN")) {
    return true;
  }

  return position === "SUPER_ADMIN";
}

export function canBypassDossierSemesterLock(params: SemesterLockBypassParams) {
  return hasSuperAdminAuthority(params);
}
