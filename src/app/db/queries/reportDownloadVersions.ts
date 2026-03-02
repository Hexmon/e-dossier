import { db } from '@/app/db/client';
import { reportDownloadVersions } from '@/app/db/schema/training/reportDownloadVersions';
import { users } from '@/app/db/schema/auth/users';
import { eq } from 'drizzle-orm';

type CreateVersionInput = {
  versionId: string;
  reportType: string;
  requestedByUserId?: string | null;
  filters: Record<string, unknown>;
  preparedBy: string;
  checkedBy: string;
  fileName: string;
  encrypted: boolean;
  checksumSha256?: string | null;
  batchId?: string | null;
};

export async function createReportDownloadVersion(input: CreateVersionInput) {
  const [row] = await db
    .insert(reportDownloadVersions)
    .values({
      versionId: input.versionId,
      reportType: input.reportType,
      requestedByUserId: input.requestedByUserId ?? null,
      filters: input.filters,
      preparedBy: input.preparedBy,
      checkedBy: input.checkedBy,
      fileName: input.fileName,
      encrypted: input.encrypted,
      checksumSha256: input.checksumSha256 ?? null,
      batchId: input.batchId ?? null,
    })
    .returning();

  return row;
}

export async function createReportDownloadVersionsBatch(items: CreateVersionInput[]) {
  if (!items.length) return [];
  return db
    .insert(reportDownloadVersions)
    .values(
      items.map((input) => ({
        versionId: input.versionId,
        reportType: input.reportType,
        requestedByUserId: input.requestedByUserId ?? null,
        filters: input.filters,
        preparedBy: input.preparedBy,
        checkedBy: input.checkedBy,
        fileName: input.fileName,
        encrypted: input.encrypted,
        checksumSha256: input.checksumSha256 ?? null,
        batchId: input.batchId ?? null,
      }))
    )
    .returning();
}

export async function getReportDownloadVersionByVersionId(versionId: string) {
  const [row] = await db
    .select({
      id: reportDownloadVersions.id,
      versionId: reportDownloadVersions.versionId,
      reportType: reportDownloadVersions.reportType,
      requestedByUserId: reportDownloadVersions.requestedByUserId,
      generatedAt: reportDownloadVersions.generatedAt,
      filters: reportDownloadVersions.filters,
      preparedBy: reportDownloadVersions.preparedBy,
      checkedBy: reportDownloadVersions.checkedBy,
      fileName: reportDownloadVersions.fileName,
      encrypted: reportDownloadVersions.encrypted,
      checksumSha256: reportDownloadVersions.checksumSha256,
      batchId: reportDownloadVersions.batchId,
      requestedByUsername: users.username,
      requestedByName: users.name,
      requestedByRank: users.rank,
    })
    .from(reportDownloadVersions)
    .leftJoin(users, eq(users.id, reportDownloadVersions.requestedByUserId))
    .where(eq(reportDownloadVersions.versionId, versionId))
    .limit(1);

  return row ?? null;
}
