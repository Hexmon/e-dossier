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
  platoonName?: string | null;
  grantorLabel?: string | null;
  label?: string | null;
};

export type LoginSwitchableAppointment = {
  id: string;
  username: string;
  positionKey: string;
  positionName: string | null;
  scopeType: string;
  scopeId: string | null;
  platoonName: string | null;
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

export function buildSwitchableAppointmentLabel(
  appointment: Pick<
    SwitchableAppointment,
    "positionName" | "positionKey" | "platoonName" | "kind" | "grantorLabel"
  >
): string {
  const base = appointment.positionName ?? appointment.positionKey ?? "Appointment";
  const scoped = appointment.platoonName ? `${base} • ${appointment.platoonName}` : base;

  if (appointment.kind === "DELEGATION") {
    return appointment.grantorLabel
      ? `${scoped} • Acting for ${appointment.grantorLabel}`
      : `${scoped} • Delegated`;
  }

  return scoped;
}

export function normalizeLoginAppointmentForSwitching(
  appointment: LoginSwitchableAppointment
): SwitchableAppointment {
  return {
    kind: "APPOINTMENT",
    id: appointment.id,
    userId: null,
    username: appointment.username,
    positionKey: appointment.positionKey,
    positionName: appointment.positionName,
    scopeType: appointment.scopeType,
    scopeId: appointment.scopeId,
    platoonName: appointment.platoonName,
    grantorLabel: null,
    appointmentId: appointment.id,
    delegationId: null,
    label: buildSwitchableAppointmentLabel({
      positionName: appointment.positionName,
      positionKey: appointment.positionKey,
      platoonName: appointment.platoonName,
      kind: "APPOINTMENT",
      grantorLabel: null,
    }),
  };
}

export function mergeSwitchableAppointments<T extends SwitchableAppointment>(
  loginAppointments: readonly LoginSwitchableAppointment[],
  identities: readonly T[]
): Array<T | SwitchableAppointment> {
  const merged = new Map<string, T | SwitchableAppointment>();

  for (const appointment of loginAppointments) {
    const normalized = normalizeLoginAppointmentForSwitching(appointment);
    merged.set(`APPOINTMENT:${normalized.id}`, normalized);
  }

  for (const identity of identities) {
    merged.set(`${identity.kind ?? "APPOINTMENT"}:${identity.id}`, identity);
  }

  return Array.from(merged.values());
}
