const DOSSIER_ROUTE_REGEX = /^\/dashboard\/([^/]+)\/milmgmt(?:\/(.*))?$/;

function normalizeSearch(search?: string): string {
  if (!search) return "";
  const trimmed = search.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("?") ? trimmed : `?${trimmed}`;
}

export function isDossierManagementRoute(pathname: string): boolean {
  return DOSSIER_ROUTE_REGEX.test(pathname);
}

export function extractDossierContext(pathname: string): { ocId: string; tailPath: string } | null {
  const match = pathname.match(DOSSIER_ROUTE_REGEX);
  if (!match) return null;

  const [, ocId, tail = ""] = match;
  return {
    ocId,
    tailPath: tail ? `/${tail}` : "",
  };
}

export function buildDossierPathForOc(
  nextOcId: string,
  pathname: string,
  search?: string
): string {
  const query = normalizeSearch(search);
  const context = extractDossierContext(pathname);

  if (!context) {
    return `/dashboard/${nextOcId}/milmgmt${query}`;
  }

  return `/dashboard/${nextOcId}/milmgmt${context.tailPath}${query}`;
}

export function buildCurrentDossierRoot(pathname: string): string | null {
  const context = extractDossierContext(pathname);
  if (!context) return null;
  return `/dashboard/${context.ocId}/milmgmt`;
}
