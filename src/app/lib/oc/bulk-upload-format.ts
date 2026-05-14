import { toDisplayDMY } from "@/app/lib/dateUtils";

export type RawRow = Record<string, unknown>;

export type UploadedPreviewRow = {
  name: string;
  tesNo: string;
  course?: string;
  branch?: string | null;
  platoon?: string | null;
  arrival: string;
};

type RequiredFieldGroup = {
  label: string;
  aliases: string[];
};

export const OC_BULK_REQUIRED_FIELD_GROUPS: RequiredFieldGroup[] = [
  {
    label: "Tes No",
    aliases: ["Tes No", "TesNo", "TES NO", "OC No", "OC Number"],
  },
  {
    label: "Name",
    aliases: ["Name"],
  },
  {
    label: "Course",
    aliases: ["Course", "Course Code", "Course Name"],
  },
  {
    label: "Dt of Arrival",
    aliases: ["Dt of Arrival", "Date of Arrival", "DOA"],
  },
];

export type OCBulkUploadFormatValidation =
  | {
      ok: true;
      nonEmptyRows: RawRow[];
    }
  | {
      ok: false;
      title: string;
      message: string;
      missingFields?: string[];
    };

export function normalizeOCBulkHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/['`’]/g, "'")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function pickOCBulkValue(row: RawRow, aliases: string[]): unknown {
  const normalizedValues = new Map<string, unknown>();
  for (const [key, value] of Object.entries(row)) {
    normalizedValues.set(normalizeOCBulkHeader(key), value);
  }

  for (const alias of aliases) {
    const value = normalizedValues.get(normalizeOCBulkHeader(alias));
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return undefined;
}

export function toOCBulkPreviewRow(row: RawRow): UploadedPreviewRow {
  const arrivalRaw = pickOCBulkValue(row, ["Dt of Arrival", "Date of Arrival", "DOA"]);

  return {
    name: String(pickOCBulkValue(row, ["Name"]) ?? ""),
    tesNo: String(pickOCBulkValue(row, ["Tes No", "TesNo", "TES NO", "OC No", "OC Number"]) ?? ""),
    course: String(pickOCBulkValue(row, ["Course", "Course Code", "Course Name"]) ?? ""),
    branch: (pickOCBulkValue(row, ["Branch"]) as string | null | undefined) ?? null,
    platoon:
      (pickOCBulkValue(row, ["Platoon", "PlatoonId", "Platoon Id", "PL", "Pl"]) as
        | string
        | null
        | undefined) ?? null,
    arrival: toDisplayDMY(arrivalRaw),
  };
}

function rowHasAnyValue(row: RawRow): boolean {
  return Object.values(row).some((value) => String(value ?? "").trim() !== "");
}

function collectNormalizedHeaders(rows: RawRow[]): Set<string> {
  const headers = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (key.trim()) {
        headers.add(normalizeOCBulkHeader(key));
      }
    }
  }
  return headers;
}

function hasAnyAlias(headers: Set<string>, aliases: string[]): boolean {
  return aliases.some((alias) => headers.has(normalizeOCBulkHeader(alias)));
}

export function getOCBulkRequiredColumnsText(): string {
  return OC_BULK_REQUIRED_FIELD_GROUPS.map((group) => group.label).join(", ");
}

export function validateOCBulkUploadRows(rows: RawRow[]): OCBulkUploadFormatValidation {
  const nonEmptyRows = rows.filter(rowHasAnyValue);

  if (nonEmptyRows.length === 0) {
    return {
      ok: false,
      title: "Invalid upload format",
      message:
        "The uploaded file is empty. Use the OC bulk upload sample format and include at least one OC row.",
    };
  }

  const headers = collectNormalizedHeaders(nonEmptyRows);
  const missingFields = OC_BULK_REQUIRED_FIELD_GROUPS
    .filter((group) => !hasAnyAlias(headers, group.aliases))
    .map((group) => group.label);

  if (missingFields.length > 0) {
    return {
      ok: false,
      title: "Invalid upload format",
      missingFields,
      message: `Invalid OC bulk upload format. Missing required column${
        missingFields.length === 1 ? "" : "s"
      }: ${missingFields.join(", ")}. Required columns are: ${getOCBulkRequiredColumnsText()}. Open "View Sample Format" and use the accepted headers before uploading again.`,
    };
  }

  const hasAnyIdentityRow = nonEmptyRows.some((row) => {
    const preview = toOCBulkPreviewRow(row);
    return Boolean(preview.name || preview.tesNo || preview.course);
  });

  if (!hasAnyIdentityRow) {
    return {
      ok: false,
      title: "Invalid upload format",
      message:
        "No usable OC rows were found. Fill TES No, Name, Course, and Dt of Arrival for each OC before uploading again.",
    };
  }

  return { ok: true, nonEmptyRows };
}
