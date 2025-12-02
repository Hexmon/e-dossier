import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { mustBeAuthed, parseParam, ensureOcExists } from '../../_checks';
import {
    OcIdParam,
    listQuerySchema,
    creditForExcellenceCreateSchema,
} from '@/app/lib/oc-validators';
import {
    createCreditForExcellence,
    createManyCreditForExcellence,
    listCreditForExcellence,
} from '@/app/db/queries/oc';

interface MotivationRecord {
    obstacle: string;
    strategy: string;
    progress: string;
    reflection: string;
}

interface SavedDataState {
    motivation: {
        records: MotivationRecord[];
    };
}


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
        const rows = await listCreditForExcellence(ocId, qp.limit ?? 100, qp.offset ?? 0);
        return json.ok({ message: 'Credit for excellence records retrieved successfully.', items: rows, count: rows.length });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function POST(req: NextRequest, ctx: any) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam(ctx, OcIdParam);
        await ensureOcExists(ocId);
        const body = await req.json();

        if (Array.isArray(body)) {
            const items = creditForExcellenceCreateSchema.array().parse(body);
            const rows = await createManyCreditForExcellence(ocId, items);
            return json.created({ message: 'Credit for excellence records created successfully.', items: rows, count: rows.length });
        }

        const dto = creditForExcellenceCreateSchema.parse(body);
        const row = await createCreditForExcellence(ocId, dto);
        return json.created({ message: 'Credit for excellence record created successfully.', data: row });
    } catch (err) {
        return handleApiError(err);
    }
}
