import { ApiClientError } from "@/app/lib/apiClient";

export type ApiValidationIssues = {
  formErrors: string[];
  fieldErrors: Record<string, string[]>;
};

const EMPTY_ISSUES: ApiValidationIssues = {
  formErrors: [],
  fieldErrors: {},
};

export function resolveApiMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    const detail =
      typeof error.extras?.detail === "string" ? error.extras.detail : null;
    return detail || error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

export function extractValidationIssues(error: unknown): ApiValidationIssues {
  if (!(error instanceof ApiClientError)) {
    return EMPTY_ISSUES;
  }

  const issues = error.extras?.issues as
    | {
        formErrors?: unknown;
        fieldErrors?: unknown;
      }
    | undefined;

  if (!issues || typeof issues !== "object") {
    return EMPTY_ISSUES;
  }

  const rawFormErrors = Array.isArray(issues.formErrors)
    ? issues.formErrors
    : [];
  const formErrors = rawFormErrors.filter(
    (item): item is string => typeof item === "string"
  );

  const fieldErrors: Record<string, string[]> = {};
  const rawFieldErrors =
    issues.fieldErrors && typeof issues.fieldErrors === "object"
      ? (issues.fieldErrors as Record<string, unknown>)
      : {};

  for (const [key, value] of Object.entries(rawFieldErrors)) {
    if (!Array.isArray(value)) continue;
    const filtered = value.filter((item): item is string => typeof item === "string");
    if (filtered.length > 0) {
      fieldErrors[key] = filtered;
    }
  }

  return { formErrors, fieldErrors };
}

export function extractRequestId(error: unknown): string | null {
  if (!(error instanceof ApiClientError)) {
    return null;
  }

  const fromHeader = error.response?.headers?.get("x-request-id");
  if (fromHeader) return fromHeader;

  const fromExtras =
    typeof error.extras?.requestId === "string" ? error.extras.requestId : null;
  return fromExtras;
}
