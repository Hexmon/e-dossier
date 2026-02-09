import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam, disciplineUpdateSchema } from '@/app/lib/oc-validators';
import { getDiscipline, updateDiscipline, deleteDiscipline } from '@/app/db/queries/oc';
import { IdSchema } from '@/app/lib/apiClient';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try { await mustBeAuthed(req);
    const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
    const { id } = await parseParam({params}, IdSchema);
    const row = await getDiscipline(ocId, id); if (!row) throw new ApiError(404,'Discipline record not found','not_found');
    return json.ok({ message: 'Discipline record retrieved successfully.', data: row });
  } catch (err) { return handleApiError(err); }
}

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try { const authCtx = await mustBeAuthed(req);
    const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
    const { id } = await parseParam({params}, IdSchema);
    const dto = disciplineUpdateSchema.parse(await req.json());
    const row = await updateDiscipline(ocId, id, dto); if (!row) throw new ApiError(404,'Discipline record not found','not_found');

    await createAuditLog({
      actorUserId: authCtx.userId,
      eventType: AuditEventType.OC_RECORD_UPDATED,
      resourceType: AuditResourceType.OC,
      resourceId: ocId,
      description: `Updated discipline record ${row.id} for OC ${ocId}`,
      metadata: {
        ocId,
        module: 'discipline',
        recordId: row.id,
        changes: Object.keys(dto),
      },
      request: req,
    });
    return json.ok({ message: 'Discipline record updated successfully.', data: row });
  } catch (err) { return handleApiError(err); }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try { const authCtx = await mustBeAuthed(req);
    const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
    const { id } = await parseParam({params}, IdSchema);
    const row = await deleteDiscipline(ocId, id); if (!row) throw new ApiError(404,'Discipline record not found','not_found');

    await createAuditLog({
      actorUserId: authCtx.userId,
      eventType: AuditEventType.OC_RECORD_DELETED,
      resourceType: AuditResourceType.OC,
      resourceId: ocId,
      description: `Deleted discipline record ${id} for OC ${ocId}`,
      metadata: {
        ocId,
        module: 'discipline',
        recordId: row.id,
        hardDeleted: false,
      },
      request: req,
    });
    return json.ok({ message: 'Discipline record deleted successfully.', id: row.id });
  } catch (err) { return handleApiError(err); }
}
export const GET = withRouteLogging('GET', GETHandler);

export const PATCH = withRouteLogging('PATCH', PATCHHandler);

export const DELETE = withRouteLogging('DELETE', DELETEHandler);
