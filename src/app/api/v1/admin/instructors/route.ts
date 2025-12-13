import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { listQuerySchema, instructorCreateSchema } from '@/app/lib/validators.courses';
import { listInstructors } from '@/app/db/queries/instructors';
import { db } from '@/app/db/client';
import { instructors } from '@/app/db/schema/training/instructors';
import { users } from '@/app/db/schema/auth/users';
import { and, eq, isNull } from 'drizzle-orm';

export async function GET(req: NextRequest) {
    try {
        await requireAuth(req);
        const sp = new URL(req.url).searchParams;
        const qp = listQuerySchema.parse({
            q: sp.get('q') ?? undefined,
            includeDeleted: sp.get('includeDeleted') ?? undefined,
            limit: sp.get('limit') ?? undefined,
            offset: sp.get('offset') ?? undefined,
        });
        const rows = await listInstructors({
            q: qp.q,
            includeDeleted: qp.includeDeleted === 'true',
            limit: qp.limit, offset: qp.offset,
        });
        return json.ok({ message: 'Instructors retrieved successfully.', items: rows, count: rows.length });
    } catch (err) { return handleApiError(err); }
}

export async function POST(req: NextRequest) {
    try {
        await requireAdmin(req);
        const body = instructorCreateSchema.parse(await req.json());

        let userId: string | null = null;
        let name: string;
        let email: string;
        let phone: string;

        if (body.userId) {
            const [user] = await db
                .select({ id: users.id, name: users.name, email: users.email, phone: users.phone })
                .from(users)
                .where(and(eq(users.id, body.userId), isNull(users.deletedAt)))
                .limit(1);
            if (!user) return json.badRequest('Invalid userId: user not found or inactive.');
            userId = user.id;
            name = user.name;
            email = user.email;
            phone = user.phone;
        } else {
            userId = null;
            name = body.name!;
            email = body.email!;
            phone = body.phone!;
        }

        const [row] = await db
            .insert(instructors)
            .values({
                userId,
                name,
                email,
                phone,
                affiliation: body.affiliation ?? null,
                notes: body.notes ?? null,
            })
            .returning();
        return json.created({ message: 'Instructor created successfully.', instructor: row });
    } catch (err) { return handleApiError(err); }
}
