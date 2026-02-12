import type { FetchOCParams } from "@/app/lib/api/ocApi";

export type OcModalSort = "name_asc" | "updated_desc";

type AptScopeClaim = {
  scope?: {
    type?: string | null;
    id?: string | null;
  } | null;
} | null | undefined;

export function resolveOcModalScope(apt: AptScopeClaim): {
  isPlatoonScoped: boolean;
  platoonId: string | null;
} {
  const scopeType = String(apt?.scope?.type ?? "").toUpperCase();
  const scopeId = apt?.scope?.id;
  return {
    isPlatoonScoped: scopeType === "PLATOON",
    platoonId: typeof scopeId === "string" && scopeId.trim().length > 0 ? scopeId : null,
  };
}

export function buildOcModalQueryParams(input: {
  platoonId?: string;
  query?: string;
  sort?: OcModalSort;
  limit?: number;
}): FetchOCParams {
  const trimmedQuery = input.query?.trim();
  const rawLimit = input.limit ?? 20;
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(rawLimit, 100)) : 20;

  return {
    active: true,
    limit,
    platoon: input.platoonId?.trim() || undefined,
    query: trimmedQuery ? trimmedQuery : undefined,
    sort: input.sort ?? "name_asc",
  };
}
