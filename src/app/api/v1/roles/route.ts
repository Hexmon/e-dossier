// import { NextRequest } from 'next/server';
// import { db } from '@/app/db/client';
// import { roles } from '@/app/db/schema/auth/rbac';
// import { and, eq, sql } from 'drizzle-orm';
// import { z } from 'zod';
// import { json, handleApiError, ApiError } from '@/app/lib/http';
// import { requireAdmin, requireAuth } from '@/app/lib/authz'; // make sure this reads cookie OR Bearer
// // If you don't have hasAdminRole exported, keep a local helper:
// const hasAdminRole = (r?: string[]) =>
//     Array.isArray(r) && r.some(k => ['ADMIN', 'SUPER_ADMIN', 'COMMANDANT'].includes(k));

// // ---------- Zod Schemas ----------
// const RoleQuerySchema = z.object({
//     key: z.string().trim().optional(),     // exact key match
//     q: z.string().trim().optional(),       // fuzzy search on key or description
//     limit: z.coerce.number().int().min(1).max(200).optional(),
//     offset: z.coerce.number().int().min(0).max(5000).optional(),
// });

// const RoleCreateSchema = z.object({
//     key: z.string().min(2).max(64).regex(/^[A-Z0-9_:-]+$/i, 'Only letters, digits, _, -, : allowed'),
//     description: z.string().max(500).optional().nullable(),
// });

// const RoleUpdateSchema = z.object({
//     id: z.string().uuid().optional(),
//     key: z.string().min(2).max(64).regex(/^[A-Z0-9_:-]+$/i).optional(),
//     // allow targeting by key if id missing
//     whereKey: z.string().min(1).optional(),
//     description: z.string().max(500).optional().nullable(),
// }).refine(v => Boolean(v.id || v.whereKey), { message: 'Provide id or whereKey to update' });

// const RoleDeleteSchema = z.object({
//     id: z.string().uuid().optional(),
//     key: z.string().min(1).optional(),
// }).refine(v => Boolean(v.id || v.key), { message: 'Provide id or key to delete' });

// function likeExpr(col: any, val: string) {
//     // drizzle doesn’t have ilike helper in pg-core; use raw sql
//     return sql`${col} ILIKE ${'%' + val + '%'}`;
// }

// // ---------- GET (PUBLIC) ----------
// export async function GET(req: NextRequest) {
//     try {
//         const { searchParams } = new URL(req.url);
//         const qp = RoleQuerySchema.parse({
//             key: searchParams.get('key') ?? undefined,
//             q: searchParams.get('q') ?? undefined,
//             limit: searchParams.get('limit') ?? undefined,
//             offset: searchParams.get('offset') ?? undefined,
//         });

//         const where = [];
//         if (qp.key) where.push(eq(roles.key, qp.key));
//         if (qp.q) {
//             where.push(
//                 sql`(${likeExpr(roles.key, qp.q)} OR ${likeExpr(roles.description, qp.q)})`
//             );
//         }

//         const rows = await db
//             .select({ id: roles.id, key: roles.key, description: roles.description })
//             .from(roles)
//             .where(where.length ? and(...where) : undefined)
//             .limit(qp.limit ?? 100)
//             .offset(qp.offset ?? 0);

//         return json.ok({ items: rows, count: rows.length });
//     } catch (err) {
//         return handleApiError(err);
//     }
// }

// // ---------- POST (ADMIN) ----------
// export async function POST(req: NextRequest) {
//     try {
//         await requireAdmin(req);

//         const body = await req.json();
//         const dto = RoleCreateSchema.parse(body);

//         // Optional: normalize key casing (e.g. uppercase)
//         const keyNorm = dto.key.trim();

//         // Upsert-like behavior? You asked “post new roles”; we’ll enforce uniqueness manually.
//         // Recommend a UNIQUE index on roles.key in DB.
//         const existing = await db.select({ id: roles.id }).from(roles).where(eq(roles.key, keyNorm)).limit(1);
//         if (existing.length) {
//             throw new ApiError(409, 'Role key already exists', 'conflict', { key: keyNorm });
//         }

//         const inserted = await db
//             .insert(roles)
//             .values({ key: keyNorm, description: dto.description ?? null })
//             .returning({ id: roles.id, key: roles.key, description: roles.description });

//         return json.created({ role: inserted[0] });
//     } catch (err) {
//         return handleApiError(err);
//     }
// }

// // ---------- PATCH (ADMIN) ----------
// export async function PATCH(req: NextRequest) {
//     try {
//         await requireAdmin(req);

//         const body = await req.json();
//         const dto = RoleUpdateSchema.parse(body);

//         // resolve target
//         const target = dto.id
//             ? await db.select().from(roles).where(eq(roles.id, dto.id)).limit(1)
//             : await db.select().from(roles).where(eq(roles.key, dto.whereKey!)).limit(1);

//         if (!target.length) throw new ApiError(404, 'Role not found', 'not_found');

//         // const updates: Partial<{ key: string | null; description: string | null }> = {};
//         // if (dto.key !== undefined) updates.key = dto.key.trim();
//         // if (dto.description !== undefined) updates.description = dto.description ?? null;
//         const updates: Partial<typeof roles.$inferInsert> = {
//             ...(dto.key !== undefined ? { key: dto.key.trim() } : {}),
//             ...(dto.description !== undefined ? { description: dto.description ?? null } : {}),
//         };
//         if (Object.keys(updates).length === 0) {
//             return json.ok({ role: { id: target[0].id, key: target[0].key, description: target[0].description }, unchanged: true });
//         }

//         // If key is changing, ensure uniqueness
//         if (updates.key) {
//             const dup = await db.select({ id: roles.id }).from(roles)
//                 .where(and(eq(roles.key, updates.key), sql`${roles.id} <> ${target[0].id}`))
//                 .limit(1);
//             if (dup.length) throw new ApiError(409, 'Role key already exists', 'conflict', { key: updates.key });
//         }

//         const updated = await db.update(roles)
//             .set(updates)
//             .where(eq(roles.id, target[0].id))
//             .returning({ id: roles.id, key: roles.key, description: roles.description });

//         return json.ok({ role: updated[0] });
//     } catch (err) {
//         return handleApiError(err);
//     }
// }

// // ---------- DELETE (ADMIN) ----------
// export async function DELETE(req: NextRequest) {
//     try {
//         await requireAdmin(req);

//         const { searchParams } = new URL(req.url);
//         const dto = RoleDeleteSchema.parse({
//             id: searchParams.get('id') ?? undefined,
//             key: searchParams.get('key') ?? undefined,
//         });

//         // resolve target
//         const target = dto.id
//             ? await db.select().from(roles).where(eq(roles.id, dto.id)).limit(1)
//             : await db.select().from(roles).where(eq(roles.key, dto.key!)).limit(1);

//         if (!target.length) throw new ApiError(404, 'Role not found', 'not_found');

//         // DELETE ... RETURNING to acknowledge what got deleted
//         const [deleted] = await db
//             .delete(roles)
//             .where(eq(roles.id, target[0].id))
//             .returning({ id: roles.id, key: roles.key, description: roles.description });

//         // FKs on role_permissions/user_roles are ON DELETE CASCADE and will cleanup automatically.
//         return json.ok({
//             message: 'Role deleted successfully',
//             role: deleted, // { id, key, description }
//         });
//     } catch (err) {
//         return handleApiError(err);
//     }
// }

// src/app/api/v1/roles/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest) {
  // TODO: fetch real roles from your DB
  return NextResponse.json({ ok: true, message: 'Roles retrieved successfully.', roles: [] }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // TODO: validate & create role
  return NextResponse.json({ ok: true, message: 'Role created successfully.', created: body }, { status: 201 });
}
