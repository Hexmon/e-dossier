import { json, handleApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../_checks';
import { OcIdParam, ssbReportFullSchema } from '@/app/lib/oc-validators';
import { getSsbReport, deleteSsbReport, listSsbPoints, upsertSsbReportWithPoints } from '@/app/db/queries/oc';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

type SsbReportRow = {
    id: string;
    overallPredictiveRating: number | null;
    scopeOfImprovement: string | null;
} | null;

type SsbPointRow = {
    kind: 'POSITIVE' | 'NEGATIVE';
    remark: string;
    authorName: string | null;
};

type SsbReportResponse = {
    positives: { note: string; by: string }[];
    negatives: { note: string; by: string }[];
    predictiveRating: number;
    scopeForImprovement: string;
};

function mapSsbDbToResponse(report: SsbReportRow, points: SsbPointRow[]): SsbReportResponse {
    const positives: SsbReportResponse['positives'] = [];
    const negatives: SsbReportResponse['negatives'] = [];

    for (const p of points) {
        const mapped = {
            note: p.remark,
            by: p.authorName ?? '',
        };

        if (p.kind === 'POSITIVE') {
            positives.push(mapped);
        } else if (p.kind === 'NEGATIVE') {
            negatives.push(mapped);
        }
    }

    return {
        positives,
        negatives,
        predictiveRating: report?.overallPredictiveRating ?? 0,
        scopeForImprovement: report?.scopeOfImprovement ?? '',
    };
}

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);

        const report = (await getSsbReport(ocId)) as SsbReportRow;
        const points = report ? ((await listSsbPoints(report.id)) as SsbPointRow[]) : [];

        const body = mapSsbDbToResponse(report, points);

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `SSB report retrieved successfully for OC ${ocId}`,
                ocId,
                module: 'ssb',
                hasReport: Boolean(report),
                pointsCount: points.length,
            },
        });

        return json.ok({ message: 'SSB report retrieved successfully.', ...body });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);

        const dto = ssbReportFullSchema.parse(await req.json());

        await upsertSsbReportWithPoints(ocId, {
            overallPredictiveRating: dto.predictiveRating,
            scopeOfImprovement: dto.scopeForImprovement,
            positives: dto.positives,
            negatives: dto.negatives,
        });

        const report = (await getSsbReport(ocId)) as SsbReportRow;
        const points = report ? ((await listSsbPoints(report.id)) as SsbPointRow[]) : [];
        const body = mapSsbDbToResponse(report, points);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Created SSB report for OC ${ocId}`,
                ocId,
                module: 'ssb',
                positives: dto.positives.length,
                negatives: dto.negatives.length,
                predictiveRating: dto.predictiveRating,
            },
        });
        return json.created({ message: 'SSB report created successfully.', ...body });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await mustBeAdmin(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);

        const existing = (await getSsbReport(ocId)) as SsbReportRow;
        const existingPoints = existing ? ((await listSsbPoints(existing.id)) as SsbPointRow[]) : [];
        const current = mapSsbDbToResponse(existing, existingPoints);

        const dto = ssbReportFullSchema.partial().parse(await req.json());

        const merged = {
            positives: dto.positives ?? current.positives,
            negatives: dto.negatives ?? current.negatives,
            predictiveRating: dto.predictiveRating ?? current.predictiveRating,
            scopeForImprovement: dto.scopeForImprovement ?? current.scopeForImprovement,
        };

        await upsertSsbReportWithPoints(ocId, {
            overallPredictiveRating: merged.predictiveRating,
            scopeOfImprovement: merged.scopeForImprovement,
            positives: merged.positives,
            negatives: merged.negatives,
        });

        const report = (await getSsbReport(ocId)) as SsbReportRow;
        const points = report ? ((await listSsbPoints(report.id)) as SsbPointRow[]) : [];
        const body = mapSsbDbToResponse(report, points);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Updated SSB report for OC ${ocId}`,
                ocId,
                module: 'ssb',
                changes: Object.keys(dto),
                positives: merged.positives.length,
                negatives: merged.negatives.length,
            },
        });
        return json.ok({ message: 'SSB report updated successfully.', ...body });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await mustBeAdmin(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const deleted = await deleteSsbReport(ocId);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Deleted SSB report for OC ${ocId}`,
                ocId,
                module: 'ssb',
                recordId: deleted?.id ?? null,
                hardDeleted: true,
            },
        });
        return json.ok({ message: 'SSB report deleted successfully.', deleted });
    } catch (err) { return handleApiError(err); }
}
export const GET = withAuditRoute('GET', GETHandler);

export const POST = withAuditRoute('POST', POSTHandler);

export const PATCH = withAuditRoute('PATCH', PATCHHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);
