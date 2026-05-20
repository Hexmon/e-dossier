import { z } from 'zod';
import { db } from '@/app/db/client';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { ocCadets, ocPersonal } from '@/app/db/schema/training/oc';
import { courses } from '@/app/db/schema/training/courses';
import { platoons } from '@/app/db/schema/auth/platoons';
import { and, eq, isNull } from 'drizzle-orm';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import { getCurrentSemesterForOc } from '@/app/db/queries/oc-enrollments';
import { syncOcLifecycleFromCadet } from '@/app/db/queries/oc-lifecycle';
import { mustHaveOcAccess } from '../_checks';

const OcParam = z.object({ ocId: z.string().uuid() });
const jnuEnrollmentNoSchema = z
    .string()
    .trim()
    .min(1)
    .regex(/^\d+$/, 'JNU Enrollment No must contain digits only')
    .max(64);
const updateSchema = z.object({
    name: z.string().min(2).optional(),
    ocNo: z.string().min(1).optional(),
    jnuEnrollmentNo: z.union([jnuEnrollmentNoSchema, z.null()]).optional(),
    courseId: z.string().uuid().optional(),
    branch: z.enum(['E', 'M', 'O']).nullable().optional(),
    platoonId: z.string().uuid().nullable().optional(),
    arrivalAtUniversity: z.coerce.date().optional(),
    withdrawnOn: z.coerce.date().nullable().optional(),
    personal: z.object({
        visibleIdentMarks: z.string().nullable().optional(),
        pi: z.string().nullable().optional(),
        dob: z.preprocess((value) => value === '' ? null : value, z.coerce.date().nullable()).optional(),
        placeOfBirth: z.string().nullable().optional(),
        domicile: z.string().nullable().optional(),
        religion: z.string().nullable().optional(),
        nationality: z.string().nullable().optional(),
        bloodGroup: z.string().nullable().optional(),
        identMarks: z.string().nullable().optional(),
        mobileNo: z.string().nullable().optional(),
        email: z.string().email().nullable().optional(),
        passportNo: z.string().nullable().optional(),
        panNo: z.string().nullable().optional(),
        aadhaarNo: z.string().nullable().optional(),
        fatherName: z.string().nullable().optional(),
        fatherMobile: z.string().nullable().optional(),
        fatherAddrPerm: z.string().nullable().optional(),
        fatherAddrPresent: z.string().nullable().optional(),
        fatherProfession: z.string().nullable().optional(),
        guardianName: z.string().nullable().optional(),
        guardianAddress: z.string().nullable().optional(),
        monthlyIncome: z.coerce.number().int().nullable().optional(),
        nokDetails: z.string().nullable().optional(),
        nokAddrPerm: z.string().nullable().optional(),
        nokAddrPresent: z.string().nullable().optional(),
        nearestRailwayStation: z.string().nullable().optional(),
        familyInSecunderabad: z.string().nullable().optional(),
        relativeInArmedForces: z.string().nullable().optional(),
        govtFinancialAssistance: z.boolean().nullable().optional(),
        bankDetails: z.string().nullable().optional(),
        idenCardNo: z.string().nullable().optional(),
        upscRollNo: z.string().nullable().optional(),
        ssbCentre: z.string().nullable().optional(),
        games: z.string().nullable().optional(),
        hobbies: z.string().nullable().optional(),
        swimmer: z.boolean().nullable().optional(),
        languages: z.string().nullable().optional(),
    }).optional(),
});

async function requireAdminForWrite(req: AuditNextRequest) {
    return requireAdmin(req);
}

function hasLifecycleChange(dto: z.infer<typeof updateSchema>) {
    return (
        dto.courseId !== undefined ||
        dto.branch !== undefined ||
        dto.platoonId !== undefined ||
        dto.withdrawnOn !== undefined
    );
}

function stripUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
    return Object.fromEntries(
        Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined),
    ) as Partial<T>;
}

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const { ocId } = await OcParam.parseAsync(await params);
        const authCtx = await mustHaveOcAccess(req, ocId);
        const [row] = await db
            .select({
                id: ocCadets.id,
                ocNo: ocCadets.ocNo,
                jnuEnrollmentNo: ocCadets.jnuEnrollmentNo,
                uid: ocCadets.uid,
                name: ocCadets.name,
                branch: ocCadets.branch,
                arrivalAtUniversity: ocCadets.arrivalAtUniversity,
                status: ocCadets.status,
                managerUserId: ocCadets.managerUserId,
                relegatedToCourseId: ocCadets.relegatedToCourseId,
                relegatedOn: ocCadets.relegatedOn,
                withdrawnOn: ocCadets.withdrawnOn,
                createdAt: ocCadets.createdAt,
                updatedAt: ocCadets.updatedAt,
                courseId: courses.id,
                courseCode: courses.code,
                courseTitle: courses.title,
                courseNotes: courses.notes,
                courseCreatedAt: courses.createdAt,
                courseUpdatedAt: courses.updatedAt,
                courseDeletedAt: courses.deletedAt,
                platoonId: platoons.id,
                platoonKey: platoons.key,
                platoonName: platoons.name,
                platoonAbout: platoons.about,
                platoonCreatedAt: platoons.createdAt,
                platoonUpdatedAt: platoons.updatedAt,
                platoonDeletedAt: platoons.deletedAt,
            })
            .from(ocCadets)
            .leftJoin(courses, eq(courses.id, ocCadets.courseId))
            .leftJoin(platoons, eq(platoons.id, ocCadets.platoonId))
            .where(and(eq(ocCadets.id, ocId), isNull(ocCadets.deletedAt)))
            .limit(1);
        if (!row) throw new ApiError(404, 'OC not found', 'not_found');
        const course = row.courseId ? {
            id: row.courseId,
            code: row.courseCode,
            title: row.courseTitle,
            notes: row.courseNotes,
            createdAt: row.courseCreatedAt,
            updatedAt: row.courseUpdatedAt,
            deletedAt: row.courseDeletedAt,
        } : null;

        const platoon = row.platoonId ? {
            id: row.platoonId,
            key: row.platoonKey,
            name: row.platoonName,
            about: row.platoonAbout,
            createdAt: row.platoonCreatedAt,
            updatedAt: row.platoonUpdatedAt,
            deletedAt: row.platoonDeletedAt,
        } : null;
        const currentSemester = await getCurrentSemesterForOc(ocId);

        const oc = {
            id: row.id,
            ocNo: row.ocNo,
            jnuEnrollmentNo: row.jnuEnrollmentNo,
            uid: row.uid,
            name: row.name,
            course,
            currentSemester,
            branch: row.branch,
            platoon,
            arrivalAtUniversity: row.arrivalAtUniversity,
            status: row.status,
            managerUserId: row.managerUserId,
            relegatedToCourseId: row.relegatedToCourseId,
            relegatedOn: row.relegatedOn,
            withdrawnOn: row.withdrawnOn,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `OC ${ocId} retrieved successfully.`,
                ocId,
            },
        });

        return json.ok({ message: 'OC retrieved successfully.', oc });
    } catch (err) { return handleApiError(err); }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await requireAdminForWrite(req);
        const { ocId } = await OcParam.parseAsync(await params);
        const dto = updateSchema.parse(await req.json());
        const { personal, ...cadetPatch } = dto;
        const [existing] = await db
            .select()
            .from(ocCadets)
            .where(and(eq(ocCadets.id, ocId), isNull(ocCadets.deletedAt)))
            .limit(1);
        if (!existing) throw new ApiError(404, 'OC not found', 'not_found');

        const row = await db.transaction(async (tx) => {
            const [updated] = await tx
                .update(ocCadets)
                .set({ ...cadetPatch, updatedAt: new Date() })
                .where(and(eq(ocCadets.id, ocId), isNull(ocCadets.deletedAt)))
                .returning();

            if (personal) {
                const personalPatch = stripUndefined(personal);
                if (Object.keys(personalPatch).length > 0) {
                    await tx
                        .insert(ocPersonal)
                        .values({ ocId, ...personalPatch })
                        .onConflictDoUpdate({
                            target: ocPersonal.ocId,
                            set: personalPatch,
                        });
                }
            }

            return updated;
        });

        if (hasLifecycleChange(dto)) {
            await syncOcLifecycleFromCadet(ocId, {
                actorUserId: adminCtx.userId,
                reason: 'oc_patch_canonical_sync',
            });
        }

        await req.audit.log({
            action: AuditEventType.OC_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Updated OC ${ocId}`,
                ocId,
                changes: Object.keys(cadetPatch),
                personalChanges: personal ? Object.keys(stripUndefined(personal)) : [],
            },
        });
        return json.ok({ message: 'OC updated successfully.', oc: row });
    } catch (err) { return handleApiError(err); }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await requireAdminForWrite(req);
        const { ocId } = await OcParam.parseAsync(await params);
        const now = new Date();
        const [row] = await db
            .update(ocCadets)
            .set({
                status: 'INACTIVE',
                deletedAt: now,
                updatedAt: now,
            })
            .where(and(eq(ocCadets.id, ocId), isNull(ocCadets.deletedAt)))
            .returning();
        if (!row) throw new ApiError(404, 'OC not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.OC_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Archived OC ${ocId}`,
                ocId,
                archived: true,
                hardDeleted: false,
            },
        });
        return json.ok({ message: 'OC archived successfully.', id: row.id, archived: true });
    } catch (err) { return handleApiError(err); }
}
export const GET = withAuditRoute('GET', GETHandler);

export const PATCH = withAuditRoute('PATCH', PATCHHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);
