// src\app\api\v1\health\route.ts
import { json } from '@/app/lib/http';
import {
  withAuditRoute,
  AuditEventType,
  AuditResourceType,
} from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(_req: AuditNextRequest) {
    try {
        const payload = {
            message: 'Health check passed.',
            service: 'api',
            uptime_sec: Math.floor(process.uptime()),
            ts: new Date().toISOString(),
        };

        await _req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'anonymous', id: 'unknown' },
            target: { type: AuditResourceType.API, id: null },
            metadata: { ...payload, description: 'Health check invoked' },
        });
        return json.ok(payload);
    } catch (err) {
        return json.serverError('Health check failed.');
    }
}
export const GET = withAuditRoute('GET', GETHandler);
