// src/app/api/v1/oc/route.ts
import { z } from 'zod';
import { db } from '@/app/db/client';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { ocCadets } from '@/app/db/schema/training/oc';
import { eq } from 'drizzle-orm';
import { courses } from '@/app/db/schema/training/courses';
import { platoons } from '@/app/db/schema/auth/platoons';
import { listOCsBasic, listOCsFull } from '@/app/db/queries/oc';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

// --- Create OC (token required; no admin) -------------------------------
const createSchema = z.object({
    name: z.string().min(2),
    ocNo: z.string().min(1),
    courseId: z.string().uuid(),                        // ← require courseId for now
    branch: z.enum(['E', 'M', 'O']).nullable().optional(),
    platoonId: z.string().uuid().nullable().optional(),
    arrivalAtUniversity: z.coerce.date(),
});

async function POSTHandler(req: AuditNextRequest) {
    try {
        const authCtx = await requireAuth(req);
        const body = createSchema.parse(await req.json());

        const [course] = await db
            .select({ id: courses.id, deletedAt: courses.deletedAt })
            .from(courses)
            .where(eq(courses.id, body.courseId))
            .limit(1);

        if (!course) {
            return json.badRequest('Course not found.');
        }
        if (course.deletedAt) {
            return json.badRequest('Course is deleted.');
        }

        let platoonId: string | null = null;
        if (body.platoonId != null) {
            const [pl] = await db
                .select({ id: platoons.id, deletedAt: platoons.deletedAt })
                .from(platoons)
                .where(eq(platoons.id, body.platoonId))
                .limit(1);
            if (!pl) return json.badRequest('Platoon not found.');
            if (pl.deletedAt) return json.badRequest('Platoon is deleted.');
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

        await req.audit.log({
            action: AuditEventType.OC_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: row.id },
            metadata: {
                description: `Created OC ${row.ocNo}`,
                ocId: row.id,
                name: row.name,
                ocNo: row.ocNo,
                uid: row.uid,
                courseId: row.courseId,
                branch: row.branch,
                platoonId: row.platoonId,
                arrivalAtUniversity: row.arrivalAtUniversity?.toISOString?.() ?? row.arrivalAtUniversity,
            },
        });

        return json.created({ message: 'OC created successfully.', oc: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function GETHandler(req: AuditNextRequest) {
    try {
        const authCtx = await requireAuth(req);
        const sp = new URL(req.url).searchParams;

        const q = (sp.get('q') || '').trim() || undefined;
        const courseId = (sp.get('courseId') || '').trim() || undefined;
        const activeOnly = (sp.get('active') || '').toLowerCase() === 'true';

        // ---------- include / full parsing ----------
        const truthy = new Set(['true', '1', 'yes', 'on', '*', 'all', 'full']);

        // collect all `include` params (support comma-separated too)
        const rawIncludes = sp
            .getAll('include')
            .flatMap((s) => s.split(','))
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);

        const includeSet = new Set(rawIncludes);

        // full toggle (only controls *loading*, not which sections are kept)
        const fullParam = (sp.get('full') || '').toLowerCase();
        const wantFullToggle =
            truthy.has(fullParam) ||
            includeSet.has('all') ||
            includeSet.has('full') ||
            includeSet.has('*');

        // explicit per-section includes (via own flag OR `include=...`)
        const explicitIncludes = {
            personal:
                truthy.has((sp.get('personal') || '').toLowerCase()) ||
                includeSet.has('personal'),
            preCommission:
                truthy.has((sp.get('preCommission') || '').toLowerCase()) ||
                includeSet.has('precommission'),
            commissioning:
                truthy.has((sp.get('commissioning') || '').toLowerCase()) ||
                includeSet.has('commissioning'),
            autobiography:
                truthy.has((sp.get('autobiography') || '').toLowerCase()) ||
                includeSet.has('autobiography'),
            familyMembers:
                truthy.has((sp.get('familyMembers') || '').toLowerCase()) ||
                includeSet.has('familymembers'),
            education:
                truthy.has((sp.get('education') || '').toLowerCase()) ||
                includeSet.has('education'),
            achievements:
                truthy.has((sp.get('achievements') || '').toLowerCase()) ||
                includeSet.has('achievements'),
            ssbReports:
                truthy.has((sp.get('ssbReports') || '').toLowerCase()) ||
                includeSet.has('ssbreports'),
            medicals:
                truthy.has((sp.get('medicals') || '').toLowerCase()) ||
                includeSet.has('medicals'),
            medicalCategory:
                truthy.has((sp.get('medicalCategory') || '').toLowerCase()) ||
                includeSet.has('medicalcategory'),
            discipline:
                truthy.has((sp.get('discipline') || '').toLowerCase()) ||
                includeSet.has('discipline'),
            parentComms:
                truthy.has((sp.get('parentComms') || '').toLowerCase()) ||
                includeSet.has('parentcomms'),
            delegations:
                truthy.has((sp.get('delegations') || '').toLowerCase()) ||
                includeSet.has('delegations'),
        };

        const anyExplicit = Object.values(explicitIncludes).some(Boolean);

        // helper: should we include a given section in response?
        const want = (key: keyof typeof explicitIncludes): boolean => {
            // If *any* explicit section flags are present, only respect them
            if (anyExplicit) {
                return explicitIncludes[key];
            }

            // No explicit flags → behave like old logic
            const p = (sp.get(key) || '').toLowerCase();
            return (
                wantFullToggle ||
                truthy.has(p) ||
                includeSet.has(key.toLowerCase())
            );
        };

        // per-section flags (what we actually return)
        const includeFlags = {
            personal: want('personal'),
            preCommission: want('preCommission'),
            commissioning: want('commissioning'),
            autobiography: want('autobiography'),
            familyMembers: want('familyMembers'),
            education: want('education'),
            achievements: want('achievements'),
            ssbReports: want('ssbReports'),
            medicals: want('medicals'),
            medicalCategory: want('medicalCategory'),
            discipline: want('discipline'),
            parentComms: want('parentComms'),
            delegations: want('delegations'),
        };

        const anySectionIncluded = Object.values(includeFlags).some(Boolean);

        const limit = Math.min(parseInt(sp.get('limit') || '200', 10) || 200, 1000);
        const offset = parseInt(sp.get('offset') || '0', 10) || 0;

        const opts = { q, courseId, active: activeOnly, limit, offset };

        const writeAccessAudit = async (count: number) => {
            await req.audit.log({
                action: AuditEventType.API_REQUEST,
                outcome: 'SUCCESS',
                actor: { type: 'user', id: authCtx.userId },
                target: { type: AuditResourceType.OC, id: 'collection' },
                metadata: {
                    description: 'Retrieved OC list via /api/v1/oc',
                    count,
                    query: { q, courseId, active: activeOnly, limit, offset },
                    includeFlags,
                    full: wantFullToggle,
                },
            });
        };

        // if NO full toggle + NO per-section includes → basic list (old behavior)
        if (!wantFullToggle && !anySectionIncluded) {
            const items = await listOCsBasic(opts);
            await writeAccessAudit(items.length);
            return json.ok({ message: 'OCs retrieved successfully.', items, count: items.length });
        }

        // If full toggle but no explicit flags → return everything exactly as before
        // (?full=true or ?include=all, but no personal=/delegations=/include=personal, etc.)
        if (wantFullToggle && !anyExplicit) {
            const items = await listOCsFull(opts);
            await writeAccessAudit(items.length);
            return json.ok({ message: 'OCs retrieved successfully.', items, count: items.length });
        }

        // Otherwise: load full and trim to only requested sections
        const fullItems = await listOCsFull(opts);

        const items = fullItems.map((item: any) => {
            const {
                personal,
                preCommission,
                commissioning,
                autobiography,
                familyMembers,
                education,
                achievements,
                ssbReports,
                medicals,
                medicalCategory,
                discipline,
                parentComms,
                delegations,
                ...base
            } = item;

            const out: any = { ...base };

            if (includeFlags.personal) out.personal = personal ?? null;
            if (includeFlags.preCommission) out.preCommission = preCommission ?? null;
            if (includeFlags.commissioning) out.commissioning = commissioning ?? null;
            if (includeFlags.autobiography) out.autobiography = autobiography ?? null;
            if (includeFlags.familyMembers) out.familyMembers = familyMembers ?? [];
            if (includeFlags.education) out.education = education ?? [];
            if (includeFlags.achievements) out.achievements = achievements ?? [];
            if (includeFlags.ssbReports) out.ssbReports = ssbReports ?? [];
            if (includeFlags.medicals) out.medicals = medicals ?? [];
            if (includeFlags.medicalCategory)
                out.medicalCategory = medicalCategory ?? [];
            if (includeFlags.discipline) out.discipline = discipline ?? [];
            if (includeFlags.parentComms) out.parentComms = parentComms ?? [];
            if (includeFlags.delegations) out.delegations = delegations ?? [];

            return out;
        });

        await writeAccessAudit(items.length);
        return json.ok({ message: 'OCs retrieved successfully.', items, count: items.length });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withAuditRoute('GET', GETHandler);

export const POST = withAuditRoute('POST', POSTHandler);
