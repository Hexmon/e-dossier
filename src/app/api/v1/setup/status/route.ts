import { json, handleApiError } from "@/app/lib/http";
import { getSetupStatus } from "@/app/lib/setup-status";
import {
  AuditEventType,
  AuditResourceType,
  withAuditRoute,
} from "@/lib/audit";
import type { AuditNextRequest } from "@/lib/audit";

export const runtime = "nodejs";

async function GETHandler(req: AuditNextRequest) {
  try {
    const setup = await getSetupStatus();

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "anonymous", id: "unknown" },
      target: { type: AuditResourceType.API, id: "setup:status:get" },
      metadata: {
        description: "Retrieved first-run setup status.",
        bootstrapRequired: setup.bootstrapRequired,
        setupComplete: setup.setupComplete,
        nextStep: setup.nextStep,
      },
    });

    return json.ok(
      {
        message: "Setup status retrieved successfully.",
        setup,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export const GET = withAuditRoute("GET", GETHandler);
