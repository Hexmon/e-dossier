import { z } from 'zod';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/app/db/client';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { listOCsBasic } from '@/app/db/queries/oc';
import { listInterviewTemplates } from '@/app/db/queries/interviewTemplates';
import { ocCourseEnrollments } from '@/app/db/schema/training/oc';
import {
    ocInterviews,
    ocInterviewFieldValues,
    ocInterviewGroupRows,
    ocInterviewGroupValues,
} from '@/app/db/schema/training/interviewOc';
import {
    interviewTemplateSections,
    interviewTemplateGroups,
    interviewTemplateFields,
} from '@/app/db/schema/training/interviewTemplates';
import { buildTemplateMappings, getTemplateMatchForSemester } from '@/lib/interviewTemplateMatching';
import type { TemplateField, TemplateGroup, TemplateInfo, TemplateSection } from '@/types/interview-templates';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import { withAuthz } from '@/app/lib/acx/withAuthz';

export const runtime = 'nodejs';

const ocListSortSchema = z.enum(['name_asc', 'updated_desc', 'created_asc']);
const pendingInterviewQuerySchema = z.object({
    q: z.string().trim().optional(),
    query: z.string().trim().optional(),
    courseId: z.string().uuid().optional(),
    platoon: z.string().trim().min(1).optional(),
    platoonId: z.string().trim().min(1).optional(),
    active: z.enum(['true', 'false']).optional(),
    limit: z.coerce.number().int().min(1).max(1000).optional(),
    offset: z.coerce.number().int().min(0).max(5000).optional(),
    sort: ocListSortSchema.optional(),
});

type ExpectedSlot = {
    templateId: string;
    semester: number;
};

function isUuid(value: string): boolean {
    return z.string().uuid().safeParse(value).success;
}

function normalizeKey(value: string) {
    return value.trim().toLowerCase();
}

function sortByOrderThen<T extends { sortOrder?: number | null; title?: string | null; key?: string | null }>(rows: T[]) {
    return [...rows].sort((a, b) => {
        const aOrder = Number(a.sortOrder ?? 0);
        const bOrder = Number(b.sortOrder ?? 0);
        if (aOrder !== bOrder) return aOrder - bOrder;
        const aText = String(a.title ?? a.key ?? '');
        const bText = String(b.title ?? b.key ?? '');
        return aText.localeCompare(bText);
    });
}

function toTemplateField(row: {
    id: string;
    key: string;
    label: string;
    fieldType: string;
    groupId: string | null;
    required: boolean;
    helpText: string | null;
    sortOrder: number;
    captureFiledAt: boolean;
    captureSignature: boolean;
}) {
    const field: TemplateField = {
        id: row.id,
        key: row.key,
        label: row.label,
        fieldType: row.fieldType,
        groupId: row.groupId,
        required: row.required,
        helpText: row.helpText,
        sortOrder: row.sortOrder,
        captureFiledAt: row.captureFiledAt,
        captureSignature: row.captureSignature,
        options: [],
    };
    return field;
}

function buildFieldsByKey(fields: TemplateField[]) {
    const map = new Map<string, TemplateField>();
    for (const field of fields) {
        map.set(normalizeKey(field.key), field);
    }
    return map;
}

function buildFieldsById(fields: TemplateField[]) {
    const map = new Map<string, TemplateField>();
    for (const field of fields) {
        map.set(field.id, field);
    }
    return map;
}

async function loadActiveTemplatesForMatching(): Promise<TemplateInfo[]> {
    const templateRows = (await listInterviewTemplates({ includeDeleted: false }) as Array<{
        id: string;
        code: string;
        title: string;
        allowMultiple: boolean;
        sortOrder: number;
        isActive: boolean;
        semesters?: number[];
    }>).filter((row) => row.isActive);
    if (!templateRows.length) return [];

    const templateIds = templateRows.map((row) => row.id);

    const [sectionRows, groupRows, fieldRows] = await Promise.all([
        db
            .select({
                id: interviewTemplateSections.id,
                templateId: interviewTemplateSections.templateId,
                title: interviewTemplateSections.title,
                description: interviewTemplateSections.description,
                sortOrder: interviewTemplateSections.sortOrder,
            })
            .from(interviewTemplateSections)
            .where(
                and(
                    inArray(interviewTemplateSections.templateId, templateIds),
                    eq(interviewTemplateSections.isActive, true),
                    isNull(interviewTemplateSections.deletedAt),
                ),
            ),
        db
            .select({
                id: interviewTemplateGroups.id,
                templateId: interviewTemplateGroups.templateId,
                title: interviewTemplateGroups.title,
                minRows: interviewTemplateGroups.minRows,
                maxRows: interviewTemplateGroups.maxRows,
                sortOrder: interviewTemplateGroups.sortOrder,
            })
            .from(interviewTemplateGroups)
            .where(
                and(
                    inArray(interviewTemplateGroups.templateId, templateIds),
                    eq(interviewTemplateGroups.isActive, true),
                    isNull(interviewTemplateGroups.deletedAt),
                ),
            ),
        db
            .select({
                id: interviewTemplateFields.id,
                templateId: interviewTemplateFields.templateId,
                sectionId: interviewTemplateFields.sectionId,
                groupId: interviewTemplateFields.groupId,
                key: interviewTemplateFields.key,
                label: interviewTemplateFields.label,
                fieldType: interviewTemplateFields.fieldType,
                required: interviewTemplateFields.required,
                helpText: interviewTemplateFields.helpText,
                sortOrder: interviewTemplateFields.sortOrder,
                captureFiledAt: interviewTemplateFields.captureFiledAt,
                captureSignature: interviewTemplateFields.captureSignature,
            })
            .from(interviewTemplateFields)
            .where(
                and(
                    inArray(interviewTemplateFields.templateId, templateIds),
                    eq(interviewTemplateFields.isActive, true),
                    isNull(interviewTemplateFields.deletedAt),
                ),
            ),
    ]);

    const sectionsByTemplate = new Map<string, Array<typeof sectionRows[number]>>();
    for (const row of sectionRows) {
        const list = sectionsByTemplate.get(row.templateId) ?? [];
        list.push(row);
        sectionsByTemplate.set(row.templateId, list);
    }

    const groupsByTemplate = new Map<string, Array<typeof groupRows[number]>>();
    for (const row of groupRows) {
        const list = groupsByTemplate.get(row.templateId) ?? [];
        list.push(row);
        groupsByTemplate.set(row.templateId, list);
    }

    const sectionFieldsBySectionId = new Map<string, TemplateField[]>();
    const groupFieldsByGroupId = new Map<string, TemplateField[]>();
    const allFieldsByTemplate = new Map<string, TemplateField[]>();

    for (const row of fieldRows) {
        const field = toTemplateField(row);

        const templateList = allFieldsByTemplate.get(row.templateId) ?? [];
        templateList.push(field);
        allFieldsByTemplate.set(row.templateId, templateList);

        if (row.groupId) {
            const groupList = groupFieldsByGroupId.get(row.groupId) ?? [];
            groupList.push(field);
            groupFieldsByGroupId.set(row.groupId, groupList);
            continue;
        }

        if (row.sectionId) {
            const sectionList = sectionFieldsBySectionId.get(row.sectionId) ?? [];
            sectionList.push(field);
            sectionFieldsBySectionId.set(row.sectionId, sectionList);
        }
    }

    const out: TemplateInfo[] = [];
    for (const template of templateRows) {
        const templateSectionRows = sortByOrderThen(sectionsByTemplate.get(template.id) ?? []);
        const sections: TemplateSection[] = templateSectionRows.map((section) => ({
            id: section.id,
            title: section.title,
            description: section.description ?? null,
            sortOrder: section.sortOrder ?? 0,
            fields: sortByOrderThen(sectionFieldsBySectionId.get(section.id) ?? []),
        }));

        const templateGroupRows = sortByOrderThen(groupsByTemplate.get(template.id) ?? []);
        const groups: TemplateGroup[] = templateGroupRows.map((group) => {
            const fields = sortByOrderThen(groupFieldsByGroupId.get(group.id) ?? []);
            return {
                id: group.id,
                title: group.title ?? null,
                minRows: group.minRows ?? 0,
                maxRows: group.maxRows ?? null,
                fields,
                fieldsByKey: buildFieldsByKey(fields),
            };
        });

        const allFields = allFieldsByTemplate.get(template.id) ?? [];
        out.push({
            id: template.id,
            code: template.code,
            title: template.title,
            sortOrder: template.sortOrder ?? 0,
            semesters: (template.semesters ?? []).slice().sort((a, b) => a - b),
            allowMultiple: template.allowMultiple ?? true,
            sections,
            groups,
            fieldsByKey: buildFieldsByKey(allFields),
            fieldsById: buildFieldsById(allFields),
        });
    }

    return out;
}

function matchIsSemesterAllowed(match: ReturnType<typeof getTemplateMatchForSemester>, semester: number) {
    if (!match) return false;
    const semesters = match.template.semesters ?? [];
    return semesters.length === 0 || semesters.includes(semester);
}

export function buildExpectedSlots(mappings: ReturnType<typeof buildTemplateMappings>) {
    const specialSlotMap = new Map<string, ExpectedSlot>();

    for (const semester of [1, 2, 3, 4, 5, 6] as const) {
        const match = getTemplateMatchForSemester(mappings, 'special', semester);
        if (!match || !matchIsSemesterAllowed(match, semester)) continue;
        const key = `${match.template.id}:${semester}`;
        specialSlotMap.set(key, { templateId: match.template.id, semester });
    }

    return {
        special: Array.from(specialSlotMap.values()),
    };
}

function interviewSlotKey(params: {
    ocId: string;
    enrollmentId: string | null;
    templateId: string;
    semester: number | null;
}) {
    return [params.ocId, params.enrollmentId ?? 'null', params.templateId, params.semester ?? 'null'].join(':');
}

function hasNonBlankText(value: string | null) {
    return typeof value === 'string' && value.trim().length > 0;
}

function isContentfulValueRow(row: {
    valueText: string | null;
    valueDate: Date | null;
    valueNumber: number | null;
    valueBool: boolean | null;
    valueJson: unknown | null;
}) {
    return (
        hasNonBlankText(row.valueText) ||
        row.valueDate !== null ||
        row.valueNumber !== null ||
        row.valueBool !== null ||
        row.valueJson !== null
    );
}

function toEpoch(value: Date | string | null | undefined) {
    if (!value) return 0;
    const date = value instanceof Date ? value : new Date(value);
    const ts = date.getTime();
    return Number.isFinite(ts) ? ts : 0;
}

function joinDistinctDisplayParts(
    primary?: string | null,
    secondary?: string | null,
    sep = ' - ',
) {
    const p = typeof primary === 'string' ? primary.trim() : '';
    const s = typeof secondary === 'string' ? secondary.trim() : '';

    if (!p && !s) return null;
    if (!p) return s || null;
    if (!s) return p || null;
    if (p.localeCompare(s, undefined, { sensitivity: 'accent' }) === 0) return p;

    return `${p}${sep}${s}`;
}

function joinDistinctCourseDisplay(courseCode?: string | null, courseTitle?: string | null) {
    const code = typeof courseCode === 'string' ? courseCode.trim() : '';
    const title = typeof courseTitle === 'string' ? courseTitle.trim() : '';

    if (!code && !title) return null;
    if (!code) return title || null;
    if (!title) return code || null;

    const norm = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
    const stripCoursePrefix = (value: string) => value.replace(/^course\s+/i, '').trim();

    const codeNorm = norm(code);
    const titleNorm = norm(title);
    const titleWithoutPrefixNorm = norm(stripCoursePrefix(title));

    if (codeNorm === titleNorm || codeNorm === titleWithoutPrefixNorm) {
        return code;
    }

    return `${code} - ${title}`;
}

async function GETHandler(req: AuditNextRequest) {
    try {
        const authCtx = await requireAuth(req);
        const sp = new URL(req.url).searchParams;
        const parsedQuery = pendingInterviewQuerySchema.safeParse({
            q: sp.get('q') ?? undefined,
            query: sp.get('query') ?? undefined,
            courseId: sp.get('courseId') ?? undefined,
            platoon: sp.get('platoon') ?? undefined,
            platoonId: sp.get('platoonId') ?? undefined,
            active: sp.get('active') ?? undefined,
            limit: sp.get('limit') ?? undefined,
            offset: sp.get('offset') ?? undefined,
            sort: sp.get('sort') ?? undefined,
        });
        if (!parsedQuery.success) {
            return json.badRequest('Validation failed.', { issues: parsedQuery.error.flatten() });
        }

        const q = parsedQuery.data.query || parsedQuery.data.q || undefined;
        const courseId = parsedQuery.data.courseId;
        const requestedPlatoon = parsedQuery.data.platoon || parsedQuery.data.platoonId;
        const activeOnly = parsedQuery.data.active === 'true';
        const limit = parsedQuery.data.limit ?? 200;
        const offset = parsedQuery.data.offset ?? 0;
        const sort = parsedQuery.data.sort ?? 'created_asc';

        const scopeType = String((authCtx.claims as any)?.apt?.scope?.type ?? '').toUpperCase();
        const scopeId = (authCtx.claims as any)?.apt?.scope?.id;
        const scopePlatoonId = typeof scopeId === 'string' && scopeId.trim().length > 0 ? scopeId : null;
        const isPlatoonScoped = scopeType === 'PLATOON';

        if (isPlatoonScoped && !scopePlatoonId) {
            return json.badRequest('Platoon scoped account is missing platoon scope id.');
        }

        let platoonId: string | undefined;
        let platoonKey: string | undefined;
        if (isPlatoonScoped) {
            if (requestedPlatoon && requestedPlatoon !== scopePlatoonId) {
                return json.forbidden('Forbidden: cannot query OCs outside assigned platoon scope.');
            }
            platoonId = scopePlatoonId ?? undefined;
        } else if (requestedPlatoon) {
            if (isUuid(requestedPlatoon)) platoonId = requestedPlatoon;
            else platoonKey = requestedPlatoon.toUpperCase();
        }

        const ocRows = await listOCsBasic({
            q,
            courseId,
            platoonId,
            platoonKey,
            active: activeOnly,
            sort,
            limit,
            offset,
        });

        if (!ocRows.length) {
            await req.audit.log({
                action: AuditEventType.API_REQUEST,
                outcome: 'SUCCESS',
                actor: { type: 'user', id: authCtx.userId },
                target: { type: AuditResourceType.API, id: 'admin.interview.pending' },
                metadata: {
                    description: 'Interview pending summary retrieved successfully.',
                    count: 0,
                    query: { q, courseId, requestedPlatoon, activeOnly, sort, limit, offset },
                    scopeEnforcedPlatoonId: isPlatoonScoped ? scopePlatoonId : null,
                },
            });
            return json.ok({ message: 'Interview pending summary retrieved successfully.', items: [], count: 0 });
        }

        const templates = await loadActiveTemplatesForMatching();
        const mappings = buildTemplateMappings(templates);
        const expected = buildExpectedSlots(mappings);
        const relevantTemplateIds = Array.from(new Set(expected.special.map((slot) => slot.templateId)));

        const ocIds = ocRows.map((row) => row.id);
        const activeEnrollments = await db
            .select({
                ocId: ocCourseEnrollments.ocId,
                enrollmentId: ocCourseEnrollments.id,
            })
            .from(ocCourseEnrollments)
            .where(and(inArray(ocCourseEnrollments.ocId, ocIds), eq(ocCourseEnrollments.status, 'ACTIVE')));

        const activeEnrollmentByOcId = new Map(activeEnrollments.map((row) => [row.ocId, row.enrollmentId]));

        const interviews =
            relevantTemplateIds.length && activeEnrollments.length
                ? await db
                      .select({
                          id: ocInterviews.id,
                          ocId: ocInterviews.ocId,
                          enrollmentId: ocInterviews.enrollmentId,
                          templateId: ocInterviews.templateId,
                          semester: ocInterviews.semester,
                          createdAt: ocInterviews.createdAt,
                          updatedAt: ocInterviews.updatedAt,
                      })
                      .from(ocInterviews)
                      .where(
                          and(
                              inArray(ocInterviews.ocId, ocIds),
                              inArray(
                                  ocInterviews.enrollmentId,
                                  activeEnrollments.map((row) => row.enrollmentId),
                              ),
                              inArray(ocInterviews.templateId, relevantTemplateIds),
                          ),
                      )
                : [];

        const interviewIds = interviews.map((row) => row.id);

        const [fieldValueRows, groupRowRows] = interviewIds.length
            ? await Promise.all([
                  db
                      .select({
                          interviewId: ocInterviewFieldValues.interviewId,
                          valueText: ocInterviewFieldValues.valueText,
                          valueDate: ocInterviewFieldValues.valueDate,
                          valueNumber: ocInterviewFieldValues.valueNumber,
                          valueBool: ocInterviewFieldValues.valueBool,
                          valueJson: ocInterviewFieldValues.valueJson,
                      })
                      .from(ocInterviewFieldValues)
                      .where(inArray(ocInterviewFieldValues.interviewId, interviewIds)),
                  db
                      .select({
                          id: ocInterviewGroupRows.id,
                          interviewId: ocInterviewGroupRows.interviewId,
                      })
                      .from(ocInterviewGroupRows)
                      .where(inArray(ocInterviewGroupRows.interviewId, interviewIds)),
              ])
            : [[], []];

        const groupRowIdToInterviewId = new Map(groupRowRows.map((row) => [row.id, row.interviewId]));
        const groupValueRows = groupRowRows.length
            ? await db
                  .select({
                      rowId: ocInterviewGroupValues.rowId,
                      valueText: ocInterviewGroupValues.valueText,
                      valueDate: ocInterviewGroupValues.valueDate,
                      valueNumber: ocInterviewGroupValues.valueNumber,
                      valueBool: ocInterviewGroupValues.valueBool,
                      valueJson: ocInterviewGroupValues.valueJson,
                  })
                  .from(ocInterviewGroupValues)
                  .where(inArray(ocInterviewGroupValues.rowId, groupRowRows.map((row) => row.id)))
            : [];

        const contentfulInterviewIds = new Set<string>();
        for (const row of fieldValueRows) {
            if (isContentfulValueRow(row)) contentfulInterviewIds.add(row.interviewId);
        }
        for (const row of groupValueRows) {
            if (!isContentfulValueRow(row)) continue;
            const interviewId = groupRowIdToInterviewId.get(row.rowId);
            if (interviewId) contentfulInterviewIds.add(interviewId);
        }

        const latestInterviewBySlot = new Map<string, { interviewId: string; updatedAt: Date | null; createdAt: Date | null }>();
        for (const interview of interviews) {
            if (interview.semester == null) continue;
            const key = interviewSlotKey({
                ocId: interview.ocId,
                enrollmentId: interview.enrollmentId ?? null,
                templateId: interview.templateId,
                semester: interview.semester,
            });
            const existing = latestInterviewBySlot.get(key);
            if (!existing) {
                latestInterviewBySlot.set(key, {
                    interviewId: interview.id,
                    updatedAt: interview.updatedAt,
                    createdAt: interview.createdAt,
                });
                continue;
            }

            const existingTs = Math.max(toEpoch(existing.updatedAt), toEpoch(existing.createdAt));
            const nextTs = Math.max(toEpoch(interview.updatedAt), toEpoch(interview.createdAt));
            if (nextTs >= existingTs) {
                latestInterviewBySlot.set(key, {
                    interviewId: interview.id,
                    updatedAt: interview.updatedAt,
                    createdAt: interview.createdAt,
                });
            }
        }

        const items = ocRows.map((row) => {
            const enrollmentId = activeEnrollmentByOcId.get(row.id) ?? null;

            const completeSpecial = expected.special.every((slot) => {
                if (!enrollmentId) return false;
                const key = interviewSlotKey({
                    ocId: row.id,
                    enrollmentId,
                    templateId: slot.templateId,
                    semester: slot.semester,
                });
                const latest = latestInterviewBySlot.get(key);
                return !!latest && contentfulInterviewIds.has(latest.interviewId);
            });

            const course = joinDistinctCourseDisplay(row.courseCode, row.courseTitle);
            const platoon = joinDistinctDisplayParts(row.platoonKey, row.platoonName);

            return {
                ocNo: row.ocNo,
                rankAndName: `OC ${row.name}`,
                course,
                platoon,
                completeInitial: true,
                completeTerms: completeSpecial,
                completeSpecial,
            };
        });

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.API, id: 'admin.interview.pending' },
            metadata: {
                description: 'Interview pending summary retrieved successfully.',
                count: items.length,
                query: { q, courseId, requestedPlatoon, activeOnly, sort, limit, offset },
                scopeEnforcedPlatoonId: isPlatoonScoped ? scopePlatoonId : null,
                requiredSpecialSlots: expected.special.length,
            },
        });

        return json.ok({
            message: 'Interview pending summary retrieved successfully.',
            items,
            count: items.length,
        });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', withAuthz(GETHandler));
