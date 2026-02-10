import { db } from '@/app/db/client';
import { ocDiscipline, ocCadets } from '@/app/db/schema/training/oc';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { eq } from 'drizzle-orm';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest) {
    try {
        const authCtx = await requireAuth(req);

        const rows = await db
            .select({
                id: ocDiscipline.id,
                ocId: ocDiscipline.ocId,
                ocName: ocCadets.name,
                ocNo: ocCadets.ocNo,
                semester: ocDiscipline.semester,
                dateOfOffence: ocDiscipline.dateOfOffence,
                offence: ocDiscipline.offence,
                punishmentAwarded: ocDiscipline.punishmentAwarded,
                awardedOn: ocDiscipline.awardedOn,
                awardedBy: ocDiscipline.awardedBy,
                numberOfPunishments: ocDiscipline.numberOfPunishments,
                pointsDelta: ocDiscipline.pointsDelta,
                pointsCumulative: ocDiscipline.pointsCumulative,
            })
            .from(ocDiscipline)
            .innerJoin(ocCadets, eq(ocDiscipline.ocId, ocCadets.id))
            .orderBy(ocDiscipline.dateOfOffence);

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.API, id: 'admin.discipline' },
            metadata: {
                description: 'Discipline records retrieved successfully.',
                count: rows.length,
            },
        });

        return json.ok({ message: 'Discipline records retrieved successfully.', data: rows });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
