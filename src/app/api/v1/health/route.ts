// src\app\api\v1\health\route.ts
import { NextRequest } from 'next/server';
import { json } from '@/app/lib/http';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(_req: NextRequest) {
    try {
        const payload = {
            message: 'Health check passed.',
            service: 'api',
            uptime_sec: Math.floor(process.uptime()),
            ts: new Date().toISOString(),
        };

        await createAuditLog({
            actorUserId: null,
            eventType: AuditEventType.API_REQUEST,
            resourceType: AuditResourceType.API,
            resourceId: null,
            description: 'Health check invoked',
            metadata: payload,
            request: _req,
        });
        return json.ok(payload);
    } catch (err) {
        return json.serverError('Health check failed.');
    }
}
export const GET = withRouteLogging('GET', GETHandler);
