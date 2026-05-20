export type BulkArchiveTarget = {
  id: string;
  name?: string | null;
  ocNo?: string | null;
};

export type BulkArchiveFailure = {
  id: string;
  label: string;
  message: string;
};

export type BulkArchiveResult = {
  archivedIds: string[];
  failed: BulkArchiveFailure[];
};

type ArchiveErrorLike = {
  status?: number;
  code?: string;
  message?: string;
};

export function formatBulkArchiveLabel(target: BulkArchiveTarget): string {
  const name = target.name?.trim();
  const ocNo = target.ocNo?.trim();

  if (name && ocNo) return `${name} (${ocNo})`;
  if (name) return name;
  if (ocNo) return ocNo;
  return target.id;
}

export function getFriendlyArchiveError(error: unknown): string {
  const err = error as ArchiveErrorLike | null | undefined;
  const status = err?.status;
  const code = err?.code;

  if (status === 401 || code === "unauthorized") {
    return "Your login session expired. Please log in again and retry.";
  }

  if (status === 403 || code === "forbidden") {
    return "You do not have permission to delete this OC.";
  }

  if (status === 404 || code === "not_found") {
    return "This OC was already deleted or no longer exists.";
  }

  if (typeof err?.message === "string" && err.message.trim()) {
    return err.message.trim();
  }

  return "Could not delete this OC. Please try again.";
}

export async function archiveOCsSequentially(
  targets: BulkArchiveTarget[],
  archiveOC: (id: string) => Promise<unknown>,
): Promise<BulkArchiveResult> {
  const archivedIds: string[] = [];
  const failed: BulkArchiveFailure[] = [];

  for (const target of targets) {
    try {
      await archiveOC(target.id);
      archivedIds.push(target.id);
    } catch (error) {
      failed.push({
        id: target.id,
        label: formatBulkArchiveLabel(target),
        message: getFriendlyArchiveError(error),
      });
    }
  }

  return { archivedIds, failed };
}

export function buildBulkArchiveSummary(result: BulkArchiveResult): string {
  const archivedCount = result.archivedIds.length;
  const failedCount = result.failed.length;

  if (archivedCount > 0 && failedCount === 0) {
    return `Deleted ${archivedCount} selected OC${archivedCount === 1 ? "" : "s"}.`;
  }

  if (archivedCount > 0 && failedCount > 0) {
    return `Deleted ${archivedCount} OC${archivedCount === 1 ? "" : "s"}. ${failedCount} could not be deleted.`;
  }

  if (failedCount > 0) {
    return `No OCs were deleted. ${failedCount} selected OC${failedCount === 1 ? "" : "s"} could not be deleted.`;
  }

  return "No OCs were selected for deletion.";
}
