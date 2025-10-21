import { NextRequest } from 'next/server';
import { db } from '@/app/db/client';
import { users } from '@/app/db/schema/auth/users';
import { credentialsLocal } from '@/app/db/schema/auth/credentials';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { userQuerySchema, userCreateSchema } from '@/app/lib/validators';
import { and, eq, sql, isNull, desc, like } from 'drizzle-orm';
import argon2 from 'argon2';

type PgErr = { code?: string; detail?: string; cause?: { code?: string; detail?: string } };

function ilike(col: any, q: string) {
    return sql`${col} ILIKE ${'%' + q + '%'}`;
}

// GET /api/v1/admin/users (ADMIN)
// ?q=..&isActive=true|false&includeDeleted=true|false&limit=&offset=
export async function GET(req: NextRequest) {
    try {
        await requireAdmin(req);

        const { searchParams } = new URL(req.url);
        const qp = userQuerySchema.parse({
            q: searchParams.get('q') ?? undefined,
            isActive: searchParams.get('isActive') ?? undefined,
            includeDeleted: searchParams.get('includeDeleted') ?? undefined,
            limit: searchParams.get('limit') ?? undefined,
            offset: searchParams.get('offset') ?? undefined,
        });

        const where: any[] = [];
        if (qp.includeDeleted !== 'true') where.push(isNull(users.deletedAt));
        if (qp.isActive === 'true') where.push(eq(users.isActive, true));
        if (qp.isActive === 'false') where.push(eq(users.isActive, false));
        if (qp.q) {
            where.push(sql`(
        ${ilike(users.username, qp.q)} OR
        ${ilike(users.email, qp.q)} OR
        ${ilike(users.name, qp.q)} OR
        ${ilike(users.phone, qp.q)}
      )`);
        }

        const rows = await db
            .select({
                id: users.id,
                username: users.username,
                name: users.name,
                email: users.email,
                phone: users.phone,
                rank: users.rank,
                appointId: users.appointId,
                isActive: users.isActive,
                deactivatedAt: users.deactivatedAt,
                deletedAt: users.deletedAt,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
            })
            .from(users)
            .where(where.length ? and(...where) : undefined)
            .orderBy(desc(users.createdAt))
            .limit(qp.limit ?? 100)
            .offset(qp.offset ?? 0);

        return json.ok({ items: rows, count: rows.length });
    } catch (err) {
        return handleApiError(err);
    }
}

// POST /api/v1/admin/users (ADMIN)
// body: userCreateSchema (password optional; if provided → credentials_local)
export async function POST(req: NextRequest) {
    try {
        await requireAdmin(req);

        const body = await req.json();
        const parsed = userCreateSchema.safeParse(body);
        if (!parsed.success) {
            return json.badRequest('Validation failed', { issues: parsed.error.flatten() });
        }

        const d = parsed.data;

        const [u] = await db
            .insert(users)
            .values({
                username: d.username.trim(),
                name: d.name.trim(),
                email: d.email.trim(),
                phone: d.phone.trim(),
                rank: d.rank.trim(),
                appointId: d.appointId ?? null,
                isActive: d.isActive ?? true,
            })
            .returning({
                id: users.id,
                username: users.username,
                name: users.name,
                email: users.email,
                phone: users.phone,
                rank: users.rank,
                appointId: users.appointId,
                isActive: users.isActive,
                deactivatedAt: users.deactivatedAt,
                deletedAt: users.deletedAt,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
            });

        if (d.password) {
            const hash = await argon2.hash(d.password);
            await db
                .insert(credentialsLocal)
                .values({
                    userId: u.id,
                    passwordHash: hash,
                    passwordAlgo: 'argon2id',
                })
                .onConflictDoNothing(); // id is PK → ignore if exists
        }

        return json.created({ user: u });
    } catch (err) {
        const e = err as PgErr;
        const code = e?.code ?? e?.cause?.code;
        if (code === '23505') {
            return json.conflict('Unique constraint violated', { detail: (e?.detail ?? e?.cause?.detail) || 'username/email/phone' });
        }
        return handleApiError(err);
    }
}
