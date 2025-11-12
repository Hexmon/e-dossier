// src/app/api/v1/oc/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/app/db/client';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { ocCadets } from '@/app/db/schema/training/oc';
import { and, eq, isNull, sql, ilike, or } from 'drizzle-orm';
import { courses } from '@/app/db/schema/training/courses';
import { platoons } from '@/app/db/schema/auth/platoons';

// --- Create OC (token required; no admin) -------------------------------
const createSchema = z.object({
    name: z.string().min(2),
    ocNo: z.string().min(1),
    courseId: z.string().uuid(),                        // ← require courseId for now
    branch: z.enum(['E', 'M', 'O']).nullable().optional(),
    platoonId: z.string().uuid().nullable().optional(),
    arrivalAtUniversity: z.coerce.date(),
});

export async function POST(req: NextRequest) {
    try {
        await requireAuth(req);
        const body = createSchema.parse(await req.json());

        const [course] = await db
            .select({ id: courses.id, deletedAt: courses.deletedAt })
            .from(courses)
            .where(eq(courses.id, body.courseId))
            .limit(1);

        if (!course) {
            return json.badRequest('Invalid courseId (course not found)');
        }
        if (course.deletedAt) {
            return json.badRequest('Invalid courseId (course is deleted)');
        }

        let platoonId: string | null = null;
        if (body.platoonId != null) {
            const [pl] = await db
                .select({ id: platoons.id, deletedAt: platoons.deletedAt })
                .from(platoons)
                .where(eq(platoons.id, body.platoonId))
                .limit(1);
            if (!pl) return json.badRequest('Invalid platoonId (platoon not found)');
            if (pl.deletedAt) return json.badRequest('Invalid platoonId (platoon is deleted)');
            platoonId = pl.id;
        }

        const uid = `UID-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

        const [row] = await db
            .insert(ocCadets)
            .values({
                name: body.name.trim(),
                ocNo: body.ocNo.trim(),
                uid,
                courseId: body.courseId,
                ...(body.branch != null ? { branch: body.branch } : {}),
                platoonId,
                arrivalAtUniversity: body.arrivalAtUniversity,
            })
            .returning({
                id: ocCadets.id,
                name: ocCadets.name,
                ocNo: ocCadets.ocNo,
                uid: ocCadets.uid,
                courseId: ocCadets.courseId,
                branch: ocCadets.branch,
                platoonId: ocCadets.platoonId,
                arrivalAtUniversity: ocCadets.arrivalAtUniversity,
                withdrawnOn: ocCadets.withdrawnOn,
                createdAt: ocCadets.createdAt,
            });

        return json.created({ oc: row });
    } catch (err) {
        return handleApiError(err);
    }
}

// --- List OCs (token required; simple filters) --------------------------
import { listOCsBasic, listOCsFull } from '@/app/db/queries/oc';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const sp = new URL(req.url).searchParams;

    const q = (sp.get('q') || '').trim() || undefined;
    const courseId = (sp.get('courseId') || '').trim() || undefined;
    const activeOnly = (sp.get('active') || '').toLowerCase() === 'true';

    // full toggle (accepts: full=true|1|all|full|* or include=full|all|*)
    const includes = new Set(sp.getAll('include').map((s) => s.toLowerCase()));
    const fullParam = (sp.get('full') || '').toLowerCase();
    const wantFull =
      ['true', '1', 'all', 'full', '*'].includes(fullParam) ||
      includes.has('all') || includes.has('full') || includes.has('*');

    const limit = Math.min(parseInt(sp.get('limit') || '200', 10) || 200, 1000);
    const offset = parseInt(sp.get('offset') || '0', 10) || 0;

    const opts = { q, courseId, active: activeOnly, limit, offset };

    const items = wantFull ? await listOCsFull(opts) : await listOCsBasic(opts);

    return json.ok({ items, count: items.length });
  } catch (err) {
    return handleApiError(err);
  }
}
