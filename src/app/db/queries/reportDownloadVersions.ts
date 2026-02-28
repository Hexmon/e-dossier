import { db } from '@/app/db/client';
import { reportDownloadVersions } from '@/app/db/schema/training/reportDownloadVersions';

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
