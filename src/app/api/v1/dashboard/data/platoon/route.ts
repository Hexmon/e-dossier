import { db } from '@/app/db/client';
import { platoons } from '@/app/db/schema/auth/platoons';
import { ocCadets } from '@/app/db/schema/training/oc';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { withAuditRoute } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest) {
    try {
        await requireAuth(req);

        const rows = await db
            .select({
                platoonId: platoons.id,
                platoonName: platoons.name,
                strength: sql<number>`COALESCE(COUNT(DISTINCT ${ocCadets.id}), 0)::int`,
            })
            .from(platoons)
            .leftJoin(
                ocCadets,
                and(
                    eq(ocCadets.platoonId, platoons.id),
                    isNull(ocCadets.withdrawnOn)
                )
            )
            .where(isNull(platoons.deletedAt))
            .groupBy(platoons.id, platoons.name)
            .orderBy(platoons.name);

        return json.ok({
            message: 'Dashboard platoon data retrieved successfully.',
            items: rows,
            count: rows.length,
        });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
