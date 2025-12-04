import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../_checks';
import { OcIdParam, listQuerySchema, eduCreateSchema } from '@/app/lib/oc-validators';
import { listEdu, createEdu } from '@/app/db/queries/oc';

export async function GET(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const sp = new URL(req.url).searchParams;
        const qp = listQuerySchema.parse({ limit: sp.get('limit') ?? undefined, offset: sp.get('offset') ?? undefined });
        const rows = await listEdu(ocId, qp.limit ?? 100, qp.offset ?? 0);
        return json.ok({ message: 'Education records retrieved successfully.', items: rows, count: rows.length });
    } catch (err) { return handleApiError(err); }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const dto = eduCreateSchema.parse(await req.json());
        const row = await createEdu(ocId, dto);
        return json.created({ message: 'Education record created successfully.', data: row });
    } catch (err) { return handleApiError(err); }
}
