import { NextRequest } from 'next/server';
import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam } from '@/app/lib/oc-validators';
import { getOlqById } from '@/app/db/queries/olq';

const IdParam = z.object({ id: z.string().uuid() });
const BoolString = z.enum(['true', 'false']).transform((v) => v === 'true');

export async function GET(req: NextRequest, ctx: any) {
    try {
        await requireAuth(req);
        const { ocId } = await parseParam(ctx, OcIdParam);
        await ensureOcExists(ocId);
        const { id } = IdParam.parse(await ctx.params);
        const sp = new URL(req.url).searchParams;
        const includeCategories = BoolString.optional().parse(sp.get('includeCategories') ?? undefined) ?? true;

        const row = await getOlqById(id, includeCategories);
        if (!row || row.ocId !== ocId) {
            throw new ApiError(404, 'OLQ record not found', 'not_found');
        }
        return json.ok({ data: row });
    } catch (err) {
        return handleApiError(err);
    }
}
