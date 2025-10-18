// import { NextRequest } from 'next/server';
// import { json, handleApiError, ApiError } from '@/app/lib/http';
// import { signupSchema } from '@/app/lib/validators';
// import { signupLocal } from '@/app/db/queries/auth';
// import { db } from '@/app/db/client';
// import { roles, userRoles } from '@/app/db/schema/auth/rbac';
// import { inArray } from 'drizzle-orm';
// import { preflightConflicts } from '@/utils/preflightConflicts';

// type PgError = { code?: string; detail?: string };

// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.json();

//     // zod validation
//     const parsed = signupSchema.safeParse(body);
//     if (!parsed.success) {
//       return json.badRequest('Validation failed', { issues: parsed.error.flatten() });
//     }

//     const { username, name, email, phone, rank, password } = parsed.data;

//     const conflicts = await preflightConflicts(username, email, phone);
//     if (conflicts.length) {
//       return json.badRequest('Already in use', { conflicts }); // e.g. { conflicts: ["username","email"] }
//     }

//     // 1) Create user + credentials (atomic)
//     const { id, username: uname } = await signupLocal({
//       username,
//       password,
//       name,
//       email,
//       phone,
//       rank,
//     });

//     // 2) (Optional) assign a default role (if present in DB)
//     //    Tries either 'GUEST' or 'guest' to fit your seeding.
//     const [defaultRole] = await db
//       .select()
//       .from(roles)
//       .where(inArray(roles.key, ['GUEST', 'guest']))
//       .limit(1);

//     if (defaultRole) {
//       await db
//         .insert(userRoles)
//         .values({ userId: id, roleId: defaultRole.id })
//         .onConflictDoNothing();
//     }

//     // 3) No auto-login, no refresh tokens. current_appointment_id stays NULL.
//     return json.created({
//       message:
//         'Signup successful. Await admin approval/appointment provisioning, then log in.',
//       user: { id, username: uname },
//     });
//   } catch (err) {
//     const e = err as PgError;

//     // Unique violations from partial-unique (username/email/phone)
//     if (e?.code === '23505') {
//       return json.badRequest('Username / email / phone already in use');
//     }

//     // Anything else → centralized error handler
//     return handleApiError(err);
//   }
// }

import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { signupSchema } from '@/app/lib/validators';
import { signupLocal } from '@/app/db/queries/auth';
import { db } from '@/app/db/client';
import { roles, userRoles } from '@/app/db/schema/auth/rbac';
import { inArray } from 'drizzle-orm';
import { createSignupRequest } from '@/app/db/queries/signupRequests';
import { preflightConflicts } from '@/utils/preflightConflicts';

type PgError = { code?: string; detail?: string };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) return json.badRequest('Validation failed', { issues: parsed.error.flatten() });

    const { username, name, email, phone, rank, password, note } = parsed?.data ?? {};

    const conflicts = await preflightConflicts(username, email, phone);
    if (conflicts.length) {
      return json.badRequest('Already in use', { conflicts });
    }

    // 1) Create disabled user
    const { id: userId, username: uname } = await signupLocal({
      username, password, name, email, phone, rank, isActive: false,
    });

    // 2) Default role (guest) if present
    const [defaultRole] = await db.select().from(roles).where(inArray(roles.key, ['GUEST', 'guest'])).limit(1);
    if (defaultRole) {
      await db.insert(userRoles).values({ userId, roleId: defaultRole.id }).onConflictDoNothing();
    }

    // 3) Create a simple signup_request (no desired position/scope)
    await createSignupRequest({
      userId,
      desiredPositionId: null,
      desiredScopeType: 'GLOBAL',
      desiredScopeId: null,
      note: note ?? null,
      payload: { username, name, email, phone, rank, note },
    });

    return json.created({
      message: 'Signup received. An admin will review your request.',
      user: { id: userId, username: uname, isActive: false },
    });
  } catch (err) {
    const e = err as PgError;
    if (e?.code === '23505') return json.badRequest('Username / email / phone already in use');
    return handleApiError(err);
  }
}
