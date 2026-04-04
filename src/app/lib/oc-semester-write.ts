import type { NextRequest } from "next/server";

import type { AuditNextRequest } from "@/lib/audit";
import { AuditEventType, AuditResourceType } from "@/lib/audit";
import {
  SEMESTER_OVERRIDE_REASON_HEADER,
  normalizeSemesterOverrideReason,
} from "@/lib/semester-override";

export type SemesterWriteDecision = {
  currentSemester: number;
  requestedSemester: number;
  supportedSemesters: number[];
  overrideApplied: boolean;
  overrideReason: string | null;
};

function deriveModuleFromRequestPath(request: Pick<NextRequest, "url">): string {
  const pathname = new URL(request.url).pathname.replace(/\/+$/, "");
  const segments = pathname.split("/").filter(Boolean);
  const ocIndex = segments.findIndex((segment) => segment === "oc");
  const moduleSegments = ocIndex >= 0 ? segments.slice(ocIndex + 2) : [];
  if (moduleSegments.length === 0) {
    return "oc";
  }

  const sanitized = moduleSegments
    .filter((segment) => !segment.startsWith("["))
    .map((segment) => segment.replace(/[^a-z0-9]+/gi, "_"))
    .filter(Boolean);

  return sanitized.join("_").toLowerCase() || "oc";
}

export function getSemesterOverrideReason(
  request?: Pick<NextRequest, "headers"> | null
): string | null {
  return normalizeSemesterOverrideReason(
    request?.headers.get(SEMESTER_OVERRIDE_REASON_HEADER) ?? null
  );
}

export async function auditOcSemesterOverrideIfUsed(params: {
  request: AuditNextRequest | NextRequest;
  authContext: { userId?: string | null };
  ocId: string;
  decision: SemesterWriteDecision;
}) {
  if (!params.decision.overrideApplied) return;

  const request = params.request as AuditNextRequest & {
    audit?: { log?: (entry: Record<string, unknown>) => Promise<unknown> | unknown };
  };

  if (typeof request.audit?.log !== "function") {
    return;
  }

  const auditKey = [
    new URL(params.request.url).pathname,
    params.request.method,
    params.ocId,
    params.decision.requestedSemester,
  ].join(":");
  const requestState = request as typeof request & {
    __semesterOverrideAuditKeys?: Set<string>;
  };
  if (requestState.__semesterOverrideAuditKeys?.has(auditKey)) {
    return;
  }
  if (!requestState.__semesterOverrideAuditKeys) {
    requestState.__semesterOverrideAuditKeys = new Set<string>();
  }
  requestState.__semesterOverrideAuditKeys.add(auditKey);

  await request.audit.log({
    action: AuditEventType.OC_SEMESTER_OVERRIDE,
    outcome: "SUCCESS",
    actor: { type: "user", id: String(params.authContext.userId ?? "") },
    target: { type: AuditResourceType.OC, id: params.ocId },
    metadata: {
      description: `Semester override used for OC ${params.ocId}`,
      ocId: params.ocId,
      module: deriveModuleFromRequestPath(params.request),
      route: new URL(params.request.url).pathname,
      method: params.request.method,
      currentSemester: params.decision.currentSemester,
      requestedSemester: params.decision.requestedSemester,
      supportedSemesters: params.decision.supportedSemesters,
      overrideReason: params.decision.overrideReason,
      overrideHeader: SEMESTER_OVERRIDE_REASON_HEADER,
    },
  });
}
