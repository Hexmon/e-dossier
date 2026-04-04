export type CurrentIdentity = {
  userId?: string | null;
  appointmentId?: string | null;
  delegationId?: string | null;
  roleKey?: string | null;
  username?: string | null;
};

export type SwitchableAppointment = {
  id: string;
  userId?: string | null;
  username?: string | null;
  positionKey?: string | null;
  positionName?: string | null;
  kind?: "APPOINTMENT" | "DELEGATION";
  appointmentId?: string | null;
  delegationId?: string | null;
  scopeType?: string | null;
  scopeId?: string | null;
};

export type UserTypeOption = {
  key: string;
  label: string;
};

export type SavedAccount = {
  userId?: string | null;
  appointmentId?: string | null;
  delegationId?: string | null;
  roleKey?: string | null;
  username?: string | null;
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
  return accounts.filter(
    (account) =>
      !isSameIdentity(current, {
        userId: account.userId ?? null,
        appointmentId: account.appointmentId ?? null,
        delegationId: account.delegationId ?? null,
        roleKey: account.roleKey ?? null,
        username: account.username ?? null,
      })
  );
}

export function isSameIdentity(
  current: CurrentIdentity,
  next: CurrentIdentity
): boolean {
  const currentDelegationId = String(current.delegationId ?? "");
  const nextDelegationId = String(next.delegationId ?? "");
  if (currentDelegationId || nextDelegationId) {
    return Boolean(
      currentDelegationId &&
        nextDelegationId &&
        currentDelegationId === nextDelegationId
    );
  }

  const currentAppointmentId = String(current.appointmentId ?? "");
  const nextAppointmentId = String(next.appointmentId ?? "");
  if (currentAppointmentId || nextAppointmentId) {
    return Boolean(
      currentAppointmentId &&
        nextAppointmentId &&
        currentAppointmentId === nextAppointmentId
    );
  }

  const currentUserId = String(current.userId ?? "");
  const nextUserId = String(next.userId ?? "");
  const currentRole = normalizeRoleKey(current.roleKey);
  const nextRole = normalizeRoleKey(next.roleKey);
  const currentUsername = normalizeUsername(current.username);
  const nextUsername = normalizeUsername(next.username);

  return Boolean(
    currentUserId &&
      nextUserId &&
      currentUserId === nextUserId &&
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
  return appointments.filter((appointment) => {
    const candidate: CurrentIdentity = {
      userId: appointment.userId ?? null,
      appointmentId:
        appointment.appointmentId ??
        (appointment.kind === "DELEGATION" ? null : appointment.id),
      delegationId:
        appointment.delegationId ??
        (appointment.kind === "DELEGATION" ? appointment.id : null),
      roleKey: appointment.positionKey ?? null,
      username: appointment.username ?? null,
    };

    return !isSameIdentity(current, candidate);
  });
}
