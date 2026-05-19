import { z } from 'zod';
import { db } from '@/app/db/client';
import { json, handleApiError } from '@/app/lib/http';
import { mustHaveOcAccess } from '../../_checks';
import { dossierInspections } from '@/app/db/schema/training/dossierInspections';
import { users } from '@/app/db/schema/auth/users';
import { appointments } from '@/app/db/schema/auth/appointments';
import { positions } from '@/app/db/schema/auth/positions';
import { ocCadets } from '@/app/db/schema/training/oc';
import { eq, desc, and, isNull, sql } from 'drizzle-orm';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

// Schema for creating/updating inspection
const inspectionBaseSchema = z.object({
  inspectorUserId: z.string().uuid().nullable().optional(),
  inspectorName: z.string().trim().min(1).max(160).optional(),
  inspectorRank: z.string().trim().min(1).max(80).optional(),
  inspectorAppointment: z.string().trim().min(1).max(160).optional(),
  date: z.coerce.date(),
  remarks: z.string().optional(),
});

const inspectionSchema = inspectionBaseSchema.refine(
  (value) =>
    Boolean(value.inspectorUserId) ||
    Boolean(value.inspectorName && value.inspectorRank && value.inspectorAppointment),
  'Select an inspector or enter inspector name, rank, and appointment.'
);

const inspectionPatchSchema = inspectionBaseSchema.partial().refine(
  (value) =>
    value.inspectorUserId !== undefined ||
    value.inspectorName !== undefined ||
    value.inspectorRank !== undefined ||
    value.inspectorAppointment !== undefined ||
    value.date !== undefined ||
    value.remarks !== undefined,
  'At least one field is required.'
).refine(
  (value) => {
    const changesInspector =
      value.inspectorUserId !== undefined ||
      value.inspectorName !== undefined ||
      value.inspectorRank !== undefined ||
      value.inspectorAppointment !== undefined;
    if (!changesInspector || value.inspectorUserId) return true;
    return Boolean(value.inspectorName && value.inspectorRank && value.inspectorAppointment);
  },
  'Select an inspector or enter inspector name, rank, and appointment.'
);

function inspectionSelect() {
  const name = sql<string>`coalesce(${dossierInspections.inspectorName}, ${users.name})`;
  const rank = sql<string>`coalesce(${dossierInspections.inspectorRank}, ${users.rank})`;
  const appointment = sql<string>`coalesce(${dossierInspections.inspectorAppointment}, ${positions.displayName})`;

  return {
    id: dossierInspections.id,
    date: dossierInspections.date,
    remarks: dossierInspections.remarks,
    createdAt: dossierInspections.createdAt,
    updatedAt: dossierInspections.updatedAt,
    inspector: {
      id: dossierInspections.inspectorUserId,
      name,
      rank,
      appointment,
    },
    initials: sql<string>`trim(concat(coalesce(${rank}, ''), ' ', coalesce(${name}, '')))`,
  };
}

function toInspectionWrite(body: z.infer<typeof inspectionBaseSchema>) {
  const isManual = !body.inspectorUserId;
  return {
    inspectorUserId: isManual ? null : body.inspectorUserId!,
    inspectorName: isManual ? body.inspectorName!.trim() : null,
    inspectorRank: isManual ? body.inspectorRank!.trim() : null,
    inspectorAppointment: isManual ? body.inspectorAppointment!.trim() : null,
    date: body.date,
    remarks: body.remarks,
  };
}

const activeAppointmentJoin = and(
  eq(appointments.userId, users.id),
  isNull(appointments.deletedAt),
  sql`${appointments.startsAt} <= now()`,
  sql`(${appointments.endsAt} IS NULL OR ${appointments.endsAt} > now())`
);

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const { ocId } = await params;
    const authCtx = await mustHaveOcAccess(req, ocId);

    // Verify OC exists
    const [oc] = await db
      .select({ id: ocCadets.id })
      .from(ocCadets)
      .where(and(eq(ocCadets.id, ocId), isNull(ocCadets.deletedAt)))
      .limit(1);

    if (!oc) {
      return json.notFound('OC not found.');
    }

    // Get inspections with inspector details
    const inspections = await db
      .select(inspectionSelect())
      .from(dossierInspections)
      .leftJoin(users, eq(dossierInspections.inspectorUserId, users.id))
      .leftJoin(appointments, activeAppointmentJoin)
      .leftJoin(positions, eq(appointments.positionId, positions.id))
      .where(and(eq(dossierInspections.ocId, ocId), isNull(dossierInspections.deletedAt)))
      .orderBy(desc(dossierInspections.createdAt));

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Dossier inspections retrieved successfully for OC ${ocId}`,
        ocId,
        module: 'dossier_inspection',
        count: inspections.length,
      },
    });

    return json.ok({
      message: 'Dossier inspections retrieved successfully.',
      inspections,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const { ocId } = await params;
    const authCtx = await mustHaveOcAccess(req, ocId);
    const body = inspectionSchema.parse(await req.json());

    // Verify OC exists
    const [oc] = await db
      .select({ id: ocCadets.id })
      .from(ocCadets)
      .where(and(eq(ocCadets.id, ocId), isNull(ocCadets.deletedAt)))
      .limit(1);

    if (!oc) {
      return json.notFound('OC not found.');
    }

    if (body.inspectorUserId) {
      const [inspector] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, body.inspectorUserId))
        .limit(1);

      if (!inspector) {
        return json.badRequest('Inspector not found.');
      }
    }

    const write = toInspectionWrite(body);
    const [inspection] = await db
      .insert(dossierInspections)
      .values({
        ocId,
        ...write,
        deletedAt: null,
      })
      .returning({
        id: dossierInspections.id,
      });

    // Fetch the full inspection with inspector details
    const fullInspection = await db
      .select(inspectionSelect())
      .from(dossierInspections)
      .leftJoin(users, eq(dossierInspections.inspectorUserId, users.id))
      .leftJoin(appointments, activeAppointmentJoin)
      .leftJoin(positions, eq(appointments.positionId, positions.id))
      .where(eq(dossierInspections.id, inspection.id))
      .limit(1);

    await req.audit.log({
      action: AuditEventType.OC_RECORD_CREATED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Created dossier inspection for OC ${ocId}`,
        inspectionId: inspection.id,
        ocId,
        inspectorUserId: write.inspectorUserId,
        inspectorName: write.inspectorName,
        inspectorRank: write.inspectorRank,
        inspectorAppointment: write.inspectorAppointment,
        date: body.date,
        remarks: body.remarks,
      },
    });

    return json.created({
      message: 'Dossier inspection created successfully.',
      inspection: fullInspection[0],
    });
  } catch (err) {
    return handleApiError(err);
  }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const { ocId } = await params;
    const authCtx = await mustHaveOcAccess(req, ocId);
    const url = new URL(req.url);
    const inspectionId = url.searchParams.get('id');

    if (!inspectionId) {
      return json.badRequest('Inspection ID is required.');
    }

    const body = inspectionPatchSchema.parse(await req.json());

    // Verify inspection exists and belongs to OC
    const [existing] = await db
      .select({ id: dossierInspections.id })
      .from(dossierInspections)
      .where(and(eq(dossierInspections.id, inspectionId), eq(dossierInspections.ocId, ocId), isNull(dossierInspections.deletedAt)))
      .limit(1);

    if (!existing) {
      return json.notFound('Inspection not found.');
    }

    if (body.inspectorUserId) {
      const [inspector] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, body.inspectorUserId))
        .limit(1);

      if (!inspector) {
        return json.badRequest('Inspector not found.');
      }
    }

    const inspectorPatch =
      body.inspectorUserId !== undefined ||
      body.inspectorName !== undefined ||
      body.inspectorRank !== undefined ||
      body.inspectorAppointment !== undefined
        ? {
            inspectorUserId: body.inspectorUserId ?? null,
            inspectorName: body.inspectorUserId ? null : body.inspectorName?.trim() ?? null,
            inspectorRank: body.inspectorUserId ? null : body.inspectorRank?.trim() ?? null,
            inspectorAppointment: body.inspectorUserId ? null : body.inspectorAppointment?.trim() ?? null,
          }
        : {};

    await db
      .update(dossierInspections)
      .set({
        ...(body.date !== undefined ? { date: body.date } : {}),
        ...(body.remarks !== undefined ? { remarks: body.remarks } : {}),
        ...inspectorPatch,
        updatedAt: new Date(),
      })
      .where(eq(dossierInspections.id, inspectionId));

    // Fetch the full updated inspection with inspector details
    const fullInspection = await db
      .select(inspectionSelect())
      .from(dossierInspections)
      .leftJoin(users, eq(dossierInspections.inspectorUserId, users.id))
      .leftJoin(appointments, activeAppointmentJoin)
      .leftJoin(positions, eq(appointments.positionId, positions.id))
      .where(eq(dossierInspections.id, inspectionId))
      .limit(1);

    await req.audit.log({
      action: AuditEventType.OC_RECORD_UPDATED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Updated dossier inspection ${inspectionId}`,
        inspectionId,
        ocId,
        changes: body,
      },
    });

    return json.ok({
      message: 'Dossier inspection updated successfully.',
      inspection: fullInspection[0],
    });
  } catch (err) {
    return handleApiError(err);
  }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const { ocId } = await params;
    const authCtx = await mustHaveOcAccess(req, ocId);
    const url = new URL(req.url);
    const inspectionId = url.searchParams.get('id');

    if (!inspectionId) {
      return json.badRequest('Inspection ID is required.');
    }

    // Verify inspection exists and belongs to OC
    const [existing] = await db
      .select({
        id: dossierInspections.id,
        inspectorUserId: dossierInspections.inspectorUserId,
        date: dossierInspections.date,
        remarks: dossierInspections.remarks,
      })
      .from(dossierInspections)
      .where(and(eq(dossierInspections.id, inspectionId), eq(dossierInspections.ocId, ocId), isNull(dossierInspections.deletedAt)))
      .limit(1);

    if (!existing) {
      return json.notFound('Inspection not found.');
    }

    await db
      .update(dossierInspections)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(dossierInspections.id, inspectionId), isNull(dossierInspections.deletedAt)));

    await req.audit.log({
      action: AuditEventType.OC_RECORD_DELETED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Deleted dossier inspection ${inspectionId}`,
        inspectionId,
        ocId,
        deletedInspection: existing,
        hardDeleted: false,
      },
    });

    return json.ok({
      message: 'Dossier inspection deleted successfully.',
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const GET = withAuditRoute('GET', GETHandler);
export const POST = withAuditRoute('POST', POSTHandler);
export const PATCH = withAuditRoute('PATCH', PATCHHandler);
export const DELETE = withAuditRoute('DELETE', DELETEHandler);
