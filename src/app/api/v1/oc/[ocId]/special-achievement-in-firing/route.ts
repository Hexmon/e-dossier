import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { mustBeAuthed, parseParam, ensureOcExists } from '../../_checks';
import { OcIdParam, listQuerySchema, specialAchievementInFiringCreateSchema } from '@/app/lib/oc-validators';
import { listSpecialAchievementInFiring, createSpecialAchievementInFiring } from '@/app/db/queries/oc';

export async function GET(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);
        const sp = new URL(req.url).searchParams;
        const qp = listQuerySchema.parse({
            limit: sp.get('limit') ?? undefined,
            offset: sp.get('offset') ?? undefined,
        });
        const rows = await listSpecialAchievementInFiring(ocId, qp.limit ?? 100, qp.offset ?? 0);
        return json.ok({ message: 'Special achievements in firing retrieved successfully.', items: rows, count: rows.length });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);
        const dto = specialAchievementInFiringCreateSchema.parse(await req.json());
        const row = await createSpecialAchievementInFiring(ocId, dto);
        return json.created({ message: 'Special achievement in firing created successfully.', data: row });
    } catch (err) {
        return handleApiError(err);
    }
}
