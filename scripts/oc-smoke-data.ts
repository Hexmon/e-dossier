export const OC_SMOKE_OC_NO_PREFIXES = ['ZL-', 'SMOKE-OC-'] as const;
export const OC_SMOKE_NAME_PREFIXES = ['Zero Loss', 'OC Smoke'] as const;

export function isOcSmokeDataCandidate(row: {
  ocNo?: string | null;
  name?: string | null;
}) {
  const ocNo = row.ocNo?.trim().toUpperCase() ?? '';
  const name = row.name?.trim().toLowerCase() ?? '';

  return (
    OC_SMOKE_OC_NO_PREFIXES.some((prefix) => ocNo.startsWith(prefix)) ||
    OC_SMOKE_NAME_PREFIXES.some((prefix) => name.startsWith(prefix.toLowerCase()))
  );
}
