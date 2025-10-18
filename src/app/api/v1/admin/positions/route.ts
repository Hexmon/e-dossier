import { NextRequest } from 'next/server';
import { db } from '@/app/db/client';
import { positions } from '@/app/db/schema/auth/positions';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { positionCreateSchema } from '@/app/lib/validators';
import { asc, eq } from 'drizzle-orm';

export async function GET() {
    try {
        const rows = await db.select().from(positions).orderBy(asc(positions.key));
        return json.ok({ data: rows });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function POST(req: NextRequest) {
    try {
        requireAdmin(req);
        const body = await req.json();
        const parsed = positionCreateSchema.safeParse(body);
        if (!parsed.success) {
            throw new ApiError(400, 'Validation failed', 'bad_request', parsed.error.flatten());
        }

        const [row] = await db
            .insert(positions)
            .values({
                key: parsed.data.key,
                displayName: parsed.data.displayName,
                defaultScope: parsed.data.defaultScope,
                singleton: parsed.data.singleton ?? true,
                description: parsed.data.description,
            })
            .returning();

        return json.created({ data: row });
    } catch (err) {
        return handleApiError(err);
    }
}