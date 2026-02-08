import { db } from '@/app/db/client';
import { users } from '@/app/db/schema/auth/users';
import { and, isNull, eq } from 'drizzle-orm';
import { ApiError, handleApiError, json } from '@/app/lib/http';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

const RESERVED = new Set(['admin', 'root', 'system', 'support', 'help', 'null', 'undefined']);
const normalize = (u: string) => u.trim().toLowerCase();

function suggest(u: string): string[] {
    const base = u.replace(/[^a-z0-9._-]/g, '');
    const picks = [base, `${base}_1`, `${base}01`, `${base}.1`, `${base}-99`];
    return Array.from(new Set(picks)).filter((s) => s && !RESERVED.has(s) && s !== u).slice(0, 3);
}

async function GETHandler(req: AuditNextRequest) {
    try {
        const raw = req.nextUrl.searchParams.get('username') ?? '';
        const username = normalize(raw);

        if (!username || username.length < 3 || username.length > 64 || !/^[a-z0-9._-]+$/.test(username)) {
            throw new ApiError(400, 'Invalid username.', 'USERNAME_RULES', {
                rules: '3–64 chars; lowercase letters, digits, dot, underscore, hyphen',
            });
        }
        if (RESERVED.has(username)) {
            return json.ok({ message: 'Username check completed.', username, assigned: true, available: false, reason: 'reserved', suggestions: suggest(username) });
        }

        const taken = await db
            .select({ id: users.id })
            .from(users)
            .where(and(eq(users.username as any, username), isNull(users.deletedAt)))
            .limit(1);

        const assigned = taken.length > 0;
        const response = { message: 'Username check completed.', username, assigned, available: !assigned, suggestions: assigned ? suggest(username) : [] };

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: null },
            target: { type: AuditResourceType.USER, id: null },
            metadata: {
                description: 'Checked username availability',
                username,
                assigned,
            },
        });
        return json.ok(response);
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withAuditRoute('GET', GETHandler);
