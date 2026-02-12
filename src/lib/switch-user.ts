export type CurrentIdentity = {
  userId?: string | null;
  appointmentId?: string | null;
  roleKey?: string | null;
  username?: string | null;
};

export type SwitchableAppointment = {
  id: string;
  userId?: string | null;
  username?: string | null;
  positionKey?: string | null;
  positionName?: string | null;
};

export type UserTypeOption = {
  key: string;
  label: string;
};

export type SavedAccount = {
  userId?: string | null;
  appointmentId?: string | null;
  roleKey?: string | null;
};

export function normalizeRoleKey(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function normalizeUsername(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

export function filterUserTypes<T extends UserTypeOption>(
  userTypes: readonly T[],
  currentRoleKey: string | null | undefined
): T[] {
  const activeRole = normalizeRoleKey(currentRoleKey);
  if (!activeRole) return [...userTypes];

  return userTypes.filter((type) => normalizeRoleKey(type.key) !== activeRole);
}

export function filterSavedAccounts<T extends SavedAccount>(
  accounts: readonly T[],
  current: CurrentIdentity
): T[] {
  const currentRole = normalizeRoleKey(current.roleKey);
  const currentUserId = String(current.userId ?? "");
  const currentAppointmentId = String(current.appointmentId ?? "");

  return accounts.filter((account) => {
    if (currentUserId && String(account.userId ?? "") === currentUserId) {
      return false;
    }

    if (
      currentAppointmentId &&
      String(account.appointmentId ?? "") === currentAppointmentId
    ) {
      return false;
    }

    if (currentRole && normalizeRoleKey(account.roleKey) === currentRole) {
      return false;
    }

    return true;
  });
}

export function isSameIdentity(
  current: CurrentIdentity,
  next: CurrentIdentity
): boolean {
  const currentUserId = String(current.userId ?? "");
  const nextUserId = String(next.userId ?? "");
  if (currentUserId && nextUserId) {
    return currentUserId === nextUserId;
  }

  const currentAppointmentId = String(current.appointmentId ?? "");
  const nextAppointmentId = String(next.appointmentId ?? "");
  if (currentAppointmentId && nextAppointmentId) {
    return currentAppointmentId === nextAppointmentId;
  }

  const currentRole = normalizeRoleKey(current.roleKey);
  const nextRole = normalizeRoleKey(next.roleKey);
  const currentUsername = normalizeUsername(current.username);
  const nextUsername = normalizeUsername(next.username);

  return Boolean(
    currentRole &&
      nextRole &&
      currentRole === nextRole &&
      currentUsername &&
      nextUsername &&
      currentUsername === nextUsername
  );
}

export function filterSwitchableAppointments<T extends SwitchableAppointment>(
  appointments: readonly T[],
  current: CurrentIdentity
): T[] {
  const currentRole = normalizeRoleKey(current.roleKey);
  const currentUserId = String(current.userId ?? "");
  const currentAppointmentId = String(current.appointmentId ?? "");
  const currentUsername = normalizeUsername(current.username);

  return appointments.filter((appointment) => {
    const appointmentRole = normalizeRoleKey(
      appointment.positionKey || appointment.positionName || ""
    );

    if (currentRole && appointmentRole === currentRole) {
      return false;
    }

    if (currentUserId && String(appointment.userId ?? "") === currentUserId) {
      return false;
    }

    if (
      currentAppointmentId &&
      String(appointment.id ?? "") === currentAppointmentId
    ) {
      return false;
    }

    if (currentUsername && normalizeUsername(appointment.username) === currentUsername) {
      return false;
    }

    return true;
  });
}
