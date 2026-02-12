export function isOcSelectable(ocId: string, disabledOcId?: string | null): boolean {
  if (!disabledOcId) return true;
  return ocId !== disabledOcId;
}
