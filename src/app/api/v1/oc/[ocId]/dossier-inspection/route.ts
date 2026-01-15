import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/app/db/client';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { dossierInspections } from '@/app/db/schema/training/dossierInspections';
import { users } from '@/app/db/schema/auth/users';
import { positions } from '@/app/db/schema/auth/positions';
import { ocCadets } from '@/app/db/schema/training/oc';
import { eq, desc, and, sql } from 'drizzle-orm';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

// Schema for creating/updating inspection
const inspectionSchema = z.object({
  inspectorUserId: z.string().uuid(),
  date: z.coerce.date(),
  remarks: z.string().optional(),
});

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const authCtx = await requireAuth(req);
    const { ocId } = await params;

    // Verify OC exists
    const [oc] = await db
      .select({ id: ocCadets.id })
      .from(ocCadets)
      .where(eq(ocCadets.id, ocId))
      .limit(1);

    if (!oc) {
      return json.notFound('OC not found.');
    }

    // Get inspections with inspector details
    const inspections = await db
      .select({
        id: dossierInspections.id,
        date: dossierInspections.date,
        remarks: dossierInspections.remarks,
        createdAt: dossierInspections.createdAt,
        updatedAt: dossierInspections.updatedAt,
        inspector: {
          id: users.id,
          name: users.name,
          rank: users.rank,
          appointment: positions.displayName,
        },
        initials: sql<string>`CONCAT(${users.rank}, ' ', ${users.name})`,
      })
      .from(dossierInspections)
      .leftJoin(users, eq(dossierInspections.inspectorUserId, users.id))
      .leftJoin(positions, eq(users.appointId, positions.id))
      .where(eq(dossierInspections.ocId, ocId))
      .orderBy(desc(dossierInspections.createdAt));

    return json.ok({
      message: 'Dossier inspections retrieved successfully.',
      inspections,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

async function POSTHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const authCtx = await requireAuth(req);
    const { ocId } = await params;
    const body = inspectionSchema.parse(await req.json());

    // Verify OC exists
    const [oc] = await db
      .select({ id: ocCadets.id })
      .from(ocCadets)
      .where(eq(ocCadets.id, ocId))
      .limit(1);

    if (!oc) {
      return json.notFound('OC not found.');
    }

    // Verify inspector exists
    const [inspector] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, body.inspectorUserId))
      .limit(1);

    if (!inspector) {
      return json.badRequest('Inspector not found.');
    }

    const [inspection] = await db
      .insert(dossierInspections)
      .values({
        ocId,
        inspectorUserId: body.inspectorUserId,
        date: body.date,
        remarks: body.remarks,
      })
      .returning({
        id: dossierInspections.id,
      });

    // Fetch the full inspection with inspector details
    const fullInspection = await db
      .select({
        id: dossierInspections.id,
        date: dossierInspections.date,
        remarks: dossierInspections.remarks,
        createdAt: dossierInspections.createdAt,
        updatedAt: dossierInspections.updatedAt,
        inspector: {
          id: users.id,
          name: users.name,
          rank: users.rank,
          appointment: positions.displayName,
        },
        initials: sql<string>`CONCAT(${users.rank}, ' ', ${users.name})`,
      })
      .from(dossierInspections)
      .leftJoin(users, eq(dossierInspections.inspectorUserId, users.id))
      .leftJoin(positions, eq(users.appointId, positions.id))
      .where(eq(dossierInspections.id, inspection.id))
      .limit(1);

    await createAuditLog({
      actorUserId: authCtx.userId,
      eventType: AuditEventType.OC_RECORD_CREATED,
      resourceType: AuditResourceType.OC,
      resourceId: ocId,
      description: `Created dossier inspection for OC ${ocId}`,
      metadata: {
        inspectionId: inspection.id,
        ocId,
        inspectorUserId: body.inspectorUserId,
        date: body.date,
        remarks: body.remarks,
      },
      request: req,
    });

    return json.created({
      message: 'Dossier inspection created successfully.',
      inspection: fullInspection[0],
    });
  } catch (err) {
    return handleApiError(err);
  }
}

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const authCtx = await requireAuth(req);
    const { ocId } = await params;
    const url = new URL(req.url);
    const inspectionId = url.searchParams.get('id');

    if (!inspectionId) {
      return json.badRequest('Inspection ID is required.');
    }

    const body = inspectionSchema.partial().parse(await req.json());

    // Verify inspection exists and belongs to OC
    const [existing] = await db
      .select({ id: dossierInspections.id })
      .from(dossierInspections)
      .where(and(eq(dossierInspections.id, inspectionId), eq(dossierInspections.ocId, ocId)))
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

    await db
      .update(dossierInspections)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(dossierInspections.id, inspectionId));

    // Fetch the full updated inspection with inspector details
    const fullInspection = await db
      .select({
        id: dossierInspections.id,
        date: dossierInspections.date,
        remarks: dossierInspections.remarks,
        createdAt: dossierInspections.createdAt,
        updatedAt: dossierInspections.updatedAt,
        inspector: {
          id: users.id,
          name: users.name,
          rank: users.rank,
          appointment: positions.displayName,
        },
        initials: sql<string>`CONCAT(${users.rank}, ' ', ${users.name})`,
      })
      .from(dossierInspections)
      .leftJoin(users, eq(dossierInspections.inspectorUserId, users.id))
      .leftJoin(positions, eq(users.appointId, positions.id))
      .where(eq(dossierInspections.id, inspectionId))
      .limit(1);

    await createAuditLog({
      actorUserId: authCtx.userId,
      eventType: AuditEventType.OC_RECORD_UPDATED,
      resourceType: AuditResourceType.OC,
      resourceId: ocId,
      description: `Updated dossier inspection ${inspectionId}`,
      metadata: {
        inspectionId,
        ocId,
        changes: body,
      },
      request: req,
    });

    return json.ok({
      message: 'Dossier inspection updated successfully.',
      inspection: fullInspection[0],
    });
  } catch (err) {
    return handleApiError(err);
  }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const authCtx = await requireAuth(req);
    const { ocId } = await params;
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
      .where(and(eq(dossierInspections.id, inspectionId), eq(dossierInspections.ocId, ocId)))
      .limit(1);

    if (!existing) {
      return json.notFound('Inspection not found.');
    }

    await db
      .delete(dossierInspections)
      .where(eq(dossierInspections.id, inspectionId));

    await createAuditLog({
      actorUserId: authCtx.userId,
      eventType: AuditEventType.OC_RECORD_DELETED,
      resourceType: AuditResourceType.OC,
      resourceId: ocId,
      description: `Deleted dossier inspection ${inspectionId}`,
      metadata: {
        inspectionId,
        ocId,
        deletedInspection: existing,
      },
      request: req,
    });

    return json.ok({
      message: 'Dossier inspection deleted successfully.',
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const GET = withRouteLogging('GET', GETHandler);
export const POST = withRouteLogging('POST', POSTHandler);
export const PATCH = withRouteLogging('PATCH', PATCHHandler);
export const DELETE = withRouteLogging('DELETE', DELETEHandler);
