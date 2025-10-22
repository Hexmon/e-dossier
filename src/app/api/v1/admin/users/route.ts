import { NextRequest } from 'next/server';
import { db } from '@/app/db/client';
import { users } from '@/app/db/schema/auth/users';
import { credentialsLocal } from '@/app/db/schema/auth/credentials';
import { json, handleApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { userQuerySchema, userCreateSchema } from '@/app/lib/validators';
import argon2 from 'argon2';
import { listUsersWithActiveAppointments, UserListQuery } from '@/app/db/queries/users';
import { eq, isNull, or, and } from 'drizzle-orm';

type PgErr = { code?: string; detail?: string; cause?: { code?: string; detail?: string } };

// GET /api/v1/admin/users (ADMIN)
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

        const rows = await listUsersWithActiveAppointments(qp as UserListQuery);
        return json.ok({ items: rows, count: rows.length });
    } catch (err) {
        return handleApiError(err);
    }
}

// POST /api/v1/admin/users (ADMIN)
// body: userCreateSchema (password optional; if provided → credentials_local)
export async function POST(req: NextRequest) {
    try {
        console.log("abdd user ");
        
        await requireAdmin(req);

        const body = await req.json();
        const parsed = userCreateSchema.safeParse(body);
        if (!parsed.success) {
            const issues = parsed.error.flatten();
            console.warn('[USER CREATE] validation failed:', JSON.stringify(issues, null, 2));
            return json.badRequest('Validation failed', { issues });
        }
        const d = parsed.data;
        const username = d.username.trim();
        const email = d.email.trim();
        const phone = d.phone.trim();

        // ---- Friendly pre-check for duplicates (soft-delete aware) ----
        const dup = await db
            .select({ id: users.id, username: users.username, email: users.email, phone: users.phone })
            .from(users)
            .where(
                and(
                    isNull(users.deletedAt),
                    or(eq(users.username, username), eq(users.email, email), eq(users.phone, phone))
                )
            )
            .limit(1);

        if (dup.length) {
            const hit = dup[0];
            const conflicts: { field: 'username' | 'email' | 'phone'; message: string }[] = [];
            if (hit.username === username) conflicts.push({ field: 'username', message: `Username "${username}" is already taken.` });
            if (hit.email === email) conflicts.push({ field: 'email', message: `Email "${email}" is already registered.` });
            if (hit.phone === phone) conflicts.push({ field: 'phone', message: `Phone "${phone}" is already registered.` });

            return json.conflict('Unique constraint violated', {
                fields: conflicts.map(c => c.field),
                messages: conflicts.map(c => c.message),
            });
        }

        // ---- Create user ----
        const [u] = await db
            .insert(users)
            .values({
                username,
                name: d.name.trim(),
                email,
                phone,
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

        // optional password
        if (d.password) {
            const hash = await argon2.hash(d.password);
            await db
                .insert(credentialsLocal)
                .values({
                    userId: u.id,
                    passwordHash: hash,
                    passwordAlgo: 'argon2id',
                })
                .onConflictDoNothing();
        }

        return json.created({ user: u });
    } catch (err) {
        // ---- DB race fallback: map index/detail to friendly messages ----
        const e = err as PgErr;
        const code = e?.code ?? e?.cause?.code;
        if (code === '23505') {
            const detail = (e?.detail ?? e?.cause?.detail ?? '').toLowerCase();

            // Adjust index names if yours differ
            const idxToField: Array<[RegExp, { field: 'username' | 'email' | 'phone'; label: string }]> = [
                /ux_users_username_active|username/.test(detail)
                    ? [/ux_users_username_active|username/, { field: 'username', label: 'Username' }]
                    : [/^$/, { field: 'username', label: 'Username' }],
            ];

            const messages: string[] = [];
            const fields: string[] = [];

            if (detail.includes('ux_users_username_active') || detail.includes('username')) {
                fields.push('username');
                messages.push('Username is already taken.');
            }
            if (detail.includes('ux_users_email_active') || detail.includes('email')) {
                fields.push('email');
                messages.push('Email is already registered.');
            }
            if (detail.includes('ux_users_phone_active') || detail.includes('phone')) {
                fields.push('phone');
                messages.push('Phone is already registered.');
            }

            // If we couldn't detect the specific field, provide a generic message
            if (fields.length === 0) {
                return json.conflict('Unique constraint violated', {
                    detail: 'Duplicate username/email/phone.',
                });
            }

            return json.conflict('Unique constraint violated', {
                fields,
                messages,
                detail: e?.detail ?? e?.cause?.detail,
            });
        }
        return handleApiError(err);
    }
}
