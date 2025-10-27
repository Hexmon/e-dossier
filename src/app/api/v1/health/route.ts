// src\app\api\v1\health\route.ts
import { NextRequest } from 'next/server';
import { json } from '@/app/lib/http';

export async function GET(_req: NextRequest) {
    try {
        return json.ok({
            service: 'api',
            uptime_sec: Math.floor(process.uptime()),
            ts: new Date().toISOString(),
        });
    } catch (err) {
        return json.serverError('Health check failed');
    }
}
