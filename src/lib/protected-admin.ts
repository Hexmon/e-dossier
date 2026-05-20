export const PROTECTED_ADMIN_POSITION_KEYS = ["ADMIN", "SUPER_ADMIN"] as const;

export type ProtectedAdminPositionKey = (typeof PROTECTED_ADMIN_POSITION_KEYS)[number];

type AppointmentLike = {
  positionKey?: string | null;
};

type UserLike = {
  activeAppointments?: AppointmentLike[] | null;
};

function normalizePositionKey(positionKey: string | null | undefined) {
  return String(positionKey ?? "").trim().toUpperCase();
}

export function getProtectedAdminPositionKey(
  positionKey: string | null | undefined
): ProtectedAdminPositionKey | null {
  const normalized = normalizePositionKey(positionKey);
  return PROTECTED_ADMIN_POSITION_KEYS.includes(normalized as ProtectedAdminPositionKey)
    ? (normalized as ProtectedAdminPositionKey)
    : null;
}

export function isProtectedAdminPosition(positionKey: string | null | undefined) {
  return getProtectedAdminPositionKey(positionKey) !== null;
}

export function getUserProtectedAdminPosition(user: UserLike): ProtectedAdminPositionKey | null {
  for (const appointment of user.activeAppointments ?? []) {
    const protectedKey = getProtectedAdminPositionKey(appointment.positionKey);
    if (protectedKey) return protectedKey;
  }
  return null;
}

export function getUserManagementProtectionReason(user: UserLike): string | null {
  const protectedKey = getUserProtectedAdminPosition(user);
  if (!protectedKey) return null;
  return "Protected ADMIN/SUPER_ADMIN users cannot be edited or deleted from User Management.";
}

export function getAppointmentManagementPolicy(
  appointment: AppointmentLike,
  options: { actorIsSuperAdmin: boolean }
) {
  const protectedKey = getProtectedAdminPositionKey(appointment.positionKey);

  if (protectedKey === "SUPER_ADMIN") {
    return {
      canHandover: false,
      canEdit: false,
      canDelete: false,
      handoverReason: "SUPER_ADMIN appointment cannot be handed over.",
      editReason: "Protected ADMIN/SUPER_ADMIN appointments cannot be edited.",
      deleteReason: "Protected ADMIN/SUPER_ADMIN appointments cannot be deleted.",
    };
  }

  if (protectedKey === "ADMIN") {
    return {
      canHandover: options.actorIsSuperAdmin,
      canEdit: false,
      canDelete: false,
      handoverReason: options.actorIsSuperAdmin
        ? null
        : "Only SUPER_ADMIN can hand over ADMIN appointment.",
      editReason: "Protected ADMIN/SUPER_ADMIN appointments cannot be edited.",
      deleteReason: "Protected ADMIN/SUPER_ADMIN appointments cannot be deleted.",
    };
  }

  return {
    canHandover: true,
    canEdit: true,
    canDelete: true,
    handoverReason: null,
    editReason: null,
    deleteReason: null,
  };
}
