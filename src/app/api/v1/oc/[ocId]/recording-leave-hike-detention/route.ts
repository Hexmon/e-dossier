import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { mustBeAuthed, parseParam, ensureOcExists } from '../../_checks';
import {
    OcIdParam,
    listQuerySchema,
    recordingLeaveHikeDetentionCreateSchema,
} from '@/app/lib/oc-validators';
import {
    listRecordingLeaveHikeDetention,
    createRecordingLeaveHikeDetention,
} from '@/app/db/queries/oc';

export async function GET(req: NextRequest, ctx: any) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam(ctx, OcIdParam);
        await ensureOcExists(ocId);
        const sp = new URL(req.url).searchParams;
        const qp = listQuerySchema.parse({
            limit: sp.get('limit') ?? undefined,
            offset: sp.get('offset') ?? undefined,
        });
        const rows = await listRecordingLeaveHikeDetention(ocId, qp.limit ?? 100, qp.offset ?? 0);
        return json.ok({ message: 'Leave/hike/detention records retrieved successfully.', items: rows, count: rows.length });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function POST(req: NextRequest, ctx: any) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam(ctx, OcIdParam);
        await ensureOcExists(ocId);
        const dto = recordingLeaveHikeDetentionCreateSchema.parse(await req.json());
        const row = await createRecordingLeaveHikeDetention(ocId, dto);
        return json.created({ message: 'Leave/hike/detention record created successfully.', data: row });
    } catch (err) {
        return handleApiError(err);
    }
}
