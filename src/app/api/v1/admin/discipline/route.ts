import { NextRequest } from 'next/server';
import { db } from '@/app/db/client';
import { ocDiscipline, ocCadets } from '@/app/db/schema/training/oc';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { eq } from 'drizzle-orm';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest) {
    try {
        await requireAuth(req);

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
                pointsDelta: ocDiscipline.pointsDelta,
                pointsCumulative: ocDiscipline.pointsCumulative,
            })
            .from(ocDiscipline)
            .innerJoin(ocCadets, eq(ocDiscipline.ocId, ocCadets.id))
            .orderBy(ocDiscipline.dateOfOffence);

        return json.ok({ message: 'Discipline records retrieved successfully.', data: rows });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withRouteLogging('GET', GETHandler);
