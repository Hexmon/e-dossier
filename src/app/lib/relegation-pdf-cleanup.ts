import { ApiError } from "@/app/lib/http";
import { deleteObject } from "@/app/lib/storage";
import { isRelegationPdfObjectCommitted } from "@/app/db/queries/relegation";
import { relegationPendingPdfCleanupSchema } from "@/app/lib/validators.relegation";

export async function deletePendingRelegationPdfObject(objectKey: string) {
  const parsed = relegationPendingPdfCleanupSchema.safeParse({ objectKey });
  if (!parsed.success) {
    throw new ApiError(400, "Invalid pending PDF object key.", "bad_request", {
      issues: parsed.error.flatten(),
    });
  }

  const committed = await isRelegationPdfObjectCommitted(parsed.data.objectKey);
  if (committed) {
    throw new ApiError(
      409,
      "This PDF is already attached to a relegation history record and cannot be deleted as pending upload.",
      "relegation_pdf_committed"
    );
  }

  await deleteObject(parsed.data.objectKey);

  return {
    deleted: true,
    objectKey: parsed.data.objectKey,
  };
}

export async function tryDeletePendingRelegationPdfObject(objectKey: string | null | undefined) {
  if (!objectKey) return;

  try {
    await deletePendingRelegationPdfObject(objectKey);
  } catch (cleanupError) {
    console.warn("[relegation] Failed to cleanup pending PDF upload", cleanupError);
  }
}
