import { NextRequest } from 'next/server';
import { db } from '@/app/db/client';
import { ocDiscipline } from '@/app/db/schema/training/oc';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { eq } from 'drizzle-orm';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAuth(req);

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

        return json.ok({ message: 'Discipline record updated successfully.', data: updated });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAuth(req);

        const { id } = await params;

        const [deleted] = await db
            .delete(ocDiscipline)
            .where(eq(ocDiscipline.id, id))
            .returning();

        if (!deleted) {
            return json.notFound('Discipline record not found');
        }

        return json.ok({ message: 'Discipline record deleted successfully.' });
    } catch (err) {
        return handleApiError(err);
    }
}

export const PATCH = withRouteLogging('PATCH', PATCHHandler);
export const DELETE = withRouteLogging('DELETE', DELETEHandler);
