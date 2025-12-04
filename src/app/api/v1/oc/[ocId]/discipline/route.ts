import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../_checks';
import { OcIdParam, listQuerySchema, disciplineCreateSchema } from '@/app/lib/oc-validators';
import { listDiscipline, createDiscipline } from '@/app/db/queries/oc';

export async function GET(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const sp = new URL(req.url).searchParams;
        const qp = listQuerySchema.parse({ limit: sp.get('limit') ?? undefined, offset: sp.get('offset') ?? undefined });
        const rows = await listDiscipline(ocId, qp.limit ?? 100, qp.offset ?? 0);
        return json.ok({ message: 'Discipline records retrieved successfully.', items: rows, count: rows.length });
    } catch (err) { return handleApiError(err); }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const dto = disciplineCreateSchema.parse(await req.json());
        return json.created({ message: 'Discipline record created successfully.', data: await createDiscipline(ocId, dto) });
    } catch (err) { return handleApiError(err); }
}
