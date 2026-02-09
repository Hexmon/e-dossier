import { db } from '@/app/db/client';
import { ocDiscipline } from '@/app/db/schema/training/oc';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { eq } from 'drizzle-orm';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authCtx = await requireAuth(req);

        const { id } = await params;
        const body = await req.json();

        // Validate required fields
        if (!body.semester || !body.dateOfOffence || !body.offence) {
            return json.badRequest('Missing required fields: semester, dateOfOffence, offence');
        }

        // Prepare update data
        const updateData: Partial<typeof ocDiscipline.$inferInsert> = {
            semester: Number(body.semester),
            dateOfOffence: new Date(body.dateOfOffence),
            offence: body.offence,
            punishmentAwarded: body.punishmentAwarded || null,
            awardedOn: body.awardedOn ? new Date(body.awardedOn) : null,
            awardedBy: body.awardedBy || null,
            numberOfPunishments: body.numberOfPunishments !== undefined ? Number(body.numberOfPunishments) : null,
            pointsDelta: body.pointsDelta !== undefined ? Number(body.pointsDelta) : 0,
        };

        const [updated] = await db
            .update(ocDiscipline)
            .set(updateData)
            .where(eq(ocDiscipline.id, id))
            .returning();

        if (!updated) {
            return json.notFound('Discipline record not found');
        }

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.API, id: `admin.discipline.${id}` },
            metadata: {
                description: `Discipline record ${id} updated successfully.`,
                recordId: id,
            },
            diff: { before: undefined, after: updated },
        });

        return json.ok({ message: 'Discipline record updated successfully.', data: updated });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authCtx = await requireAuth(req);

        const { id } = await params;

        const [deleted] = await db
            .delete(ocDiscipline)
            .where(eq(ocDiscipline.id, id))
            .returning();

        if (!deleted) {
            return json.notFound('Discipline record not found');
        }

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.API, id: `admin.discipline.${id}` },
            metadata: {
                description: `Discipline record ${id} deleted successfully.`,
                recordId: id,
            },
            diff: { before: deleted, after: undefined },
        });

        return json.ok({ message: 'Discipline record deleted successfully.' });
    } catch (err) {
        return handleApiError(err);
    }
}

export const PATCH = withAuditRoute('PATCH', PATCHHandler);
export const DELETE = withAuditRoute('DELETE', DELETEHandler);
