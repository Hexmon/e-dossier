export type OCBulkUploadResult = {
  success: number;
  failed: number;
  errors?: Array<{ row: number; error: string }>;
};

export type OCBulkUploadToast =
  | { variant: "success"; message: string }
  | { variant: "error"; message: string }
  | null;

function pluralizeOc(count: number): string {
  return `${count} OC${count === 1 ? "" : "s"}`;
}

function pluralizeRow(count: number): string {
  return `${count} row${count === 1 ? "" : "s"}`;
}

export function buildOCBulkUploadToast(result: OCBulkUploadResult | null | undefined): OCBulkUploadToast {
  if (!result) return null;

  const success = Math.max(0, Number(result.success) || 0);
  const failed = Math.max(0, Number(result.failed) || 0);

  if (success > 0 && failed === 0) {
    return {
      variant: "success",
      message: `Bulk upload completed: ${pluralizeOc(success)} uploaded.`,
    };
  }

  if (success > 0 && failed > 0) {
    return {
      variant: "error",
      message: `Bulk upload partially completed: ${pluralizeOc(success)} uploaded, ${pluralizeRow(failed)} failed. Review failed rows in the upload review.`,
    };
  }

  if (failed > 0) {
    return {
      variant: "error",
      message: `Bulk upload failed: ${pluralizeRow(failed)} failed. Review errors in the upload review.`,
    };
  }

  return {
    variant: "error",
    message: "No OC rows were uploaded. Review the upload file and try again.",
  };
}
