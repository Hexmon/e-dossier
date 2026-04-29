type PositionLike = {
  id: string;
  key: string;
  displayName: string | null;
  defaultScope: "GLOBAL" | "PLATOON";
};

export function normalizePositionKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function findReusablePosition<T extends PositionLike>(
  positions: readonly T[],
  appointmentName: string,
): T | null {
  const normalizedName = appointmentName.trim().toLowerCase();
  const normalizedKey = normalizePositionKey(appointmentName);

  return (
    positions.find((position) => position.key.toLowerCase() === normalizedKey) ??
    positions.find(
      (position) => (position.displayName ?? "").trim().toLowerCase() === normalizedName,
    ) ??
    null
  );
}
