import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { parseParam, ensureOcExists } from '../../_checks';
import { OcIdParam } from '@/app/lib/oc-validators';
import { authorizeOcAccess } from '@/lib/authorization';
import { getOcAcademics } from '@/app/services/oc-academics';

export async function GET(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);
        await authorizeOcAccess(req, ocId);
        const sp = new URL(req.url).searchParams;
        const semester = sp.get('semester') ? Number(sp.get('semester')) : undefined;
        const semesters = await getOcAcademics(ocId, { semester });
        return json.ok({
            message: 'Academic records retrieved successfully.',
            items: semesters,
            count: semesters.length,
        });
    } catch (err) {
        return handleApiError(err);
    }
}
