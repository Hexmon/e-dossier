import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam, medCatUpdateSchema } from '@/app/lib/oc-validators';
import { getMedCat, updateMedCat, deleteMedCat } from '@/app/db/queries/oc';
import { IdSchema } from '@/app/lib/apiClient';

export async function GET(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try { await mustBeAuthed(req);
    const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
    const { id } = await parseParam({params}, IdSchema);
    const row = await getMedCat(ocId, id); if (!row) throw new ApiError(404,'Medical category not found','not_found');
    return json.ok({ message: 'Medical category record retrieved successfully.', data: row });
  } catch (err) { return handleApiError(err); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try { await mustBeAdmin(req);
    const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
    const { id } = await parseParam({params}, IdSchema);
    const dto = medCatUpdateSchema.parse(await req.json());
    const row = await updateMedCat(ocId, id, dto); if (!row) throw new ApiError(404,'Medical category not found','not_found');
    return json.ok({ message: 'Medical category record updated successfully.', data: row });
  } catch (err) { return handleApiError(err); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try { await mustBeAdmin(req);
    const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
    const { id } = await parseParam({params}, IdSchema);
    const row = await deleteMedCat(ocId, id); if (!row) throw new ApiError(404,'Medical category not found','not_found');
    return json.ok({ message: 'Medical category record deleted successfully.', id: row.id });
  } catch (err) { return handleApiError(err); }
}
