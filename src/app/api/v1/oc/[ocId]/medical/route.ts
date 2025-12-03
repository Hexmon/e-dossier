import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { OcIdParam, listQuerySchema, medicalCreateSchema } from '@/app/lib/oc-validators';
import { listMedicals, createMedical } from '@/app/db/queries/oc';
import { mustBeAuthed, parseParam, ensureOcExists } from '../../_checks';

export async function GET(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const sp = new URL(req.url).searchParams;
        const qp = listQuerySchema.parse({ limit: sp.get('limit') ?? undefined, offset: sp.get('offset') ?? undefined });
        const rows = await listMedicals(ocId, qp.limit ?? 100, qp.offset ?? 0);
        return json.ok({ message: 'Medical records retrieved successfully.', items: rows, count: rows.length });
    } catch (err) { return handleApiError(err); }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const dto = medicalCreateSchema.parse(await req.json());
        return json.created({ message: 'Medical record created successfully.', data: await createMedical(ocId, dto) });
    } catch (err) { return handleApiError(err); }
}
