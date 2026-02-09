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
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const authCtx = await mustBeAuthed(req);
    const { ocId } = await parseParam({ params }, OcIdParam);
    await ensureOcExists(ocId);
    const sp = new URL(req.url).searchParams;
    const qp = listQuerySchema.parse({
      limit: sp.get('limit') ?? undefined,
      offset: sp.get('offset') ?? undefined,
    });
    const rows = await listCreditForExcellence(ocId, qp.limit ?? 100, qp.offset ?? 0);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: 'Credit for excellence records retrieved successfully.',
        ocId,
        module: 'credit_for_excellence',
        count: rows.length,
        query: {
          limit: qp.limit ?? null,
          offset: qp.offset ?? null,
        },
      },
    });

    return json.ok({ message: 'Credit for excellence records retrieved successfully.', items: rows, count: rows.length });
  } catch (err) {
    return handleApiError(err);
  }
}

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const authCtx = await mustBeAuthed(req);
    const { ocId } = await parseParam({ params }, OcIdParam);
    await ensureOcExists(ocId);
    const body = await req.json();

    if (Array.isArray(body)) {
      const items = creditForExcellenceCreateSchema.array().parse(body);
      const rows = await createManyCreditForExcellence(ocId, items);

      await req.audit.log({
        action: AuditEventType.OC_RECORD_CREATED,
        outcome: 'SUCCESS',
        actor: { type: 'user', id: authCtx.userId },
        target: { type: AuditResourceType.OC, id: ocId },
        metadata: {
          description: `Created ${rows.length} credit-for-excellence records for OC ${ocId}`,
          ocId,
          module: 'credit_for_excellence',
          count: rows.length,
          recordIds: rows.map((r) => r.id),
        },
      });
      return json.created({ message: 'Credit for excellence records created successfully.', items: rows, count: rows.length });
    }

    const dto = creditForExcellenceCreateSchema.parse(body);
    const row = await createCreditForExcellence(ocId, dto);

    await req.audit.log({
      action: AuditEventType.OC_RECORD_CREATED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Created credit-for-excellence record ${row.id} for OC ${ocId}`,
        ocId,
        module: 'credit_for_excellence',
        recordId: row.id,
      },
    });
    return json.created({ message: 'Credit for excellence record created successfully.', data: row });
  } catch (err) {
    return handleApiError(err);
  }
}

export const GET = withAuditRoute('GET', GETHandler);

export const POST = withAuditRoute('POST', POSTHandler);
