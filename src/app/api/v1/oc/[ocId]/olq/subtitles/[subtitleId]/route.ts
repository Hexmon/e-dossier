import { NextRequest } from 'next/server';
import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { olqSubtitleUpdateSchema } from '@/app/lib/olq-validators';
import { getOlqSubtitle, updateOlqSubtitle, deleteOlqSubtitle } from '@/app/db/queries/olq';

const SubtitleIdParam = z.object({ subtitleId: z.string().uuid() });

export async function GET(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await requireAuth(req);
        const { subtitleId } = SubtitleIdParam.parse(await params);
        const row = await getOlqSubtitle(subtitleId);
        if (!row) throw new ApiError(404, 'Subtitle not found', 'not_found');
        return json.ok({ message: 'OLQ subtitle retrieved successfully.', subtitle: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await requireAdmin(req);
        const { subtitleId } = SubtitleIdParam.parse(await params);
        const dto = olqSubtitleUpdateSchema.parse(await req.json());
        const row = await updateOlqSubtitle(subtitleId, { ...dto });
        if (!row) throw new ApiError(404, 'Subtitle not found', 'not_found');
        return json.ok({ message: 'OLQ subtitle updated successfully.', subtitle: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await requireAdmin(req);
        const { subtitleId } = SubtitleIdParam.parse(await params);
        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deleteOlqSubtitle(subtitleId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'Subtitle not found', 'not_found');
        return json.ok({ message: 'OLQ subtitle deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}
