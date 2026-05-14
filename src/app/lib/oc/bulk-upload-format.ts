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
  required: boolean;
};

export const OC_BULK_FIELD_GROUPS: RequiredFieldGroup[] = [
  {
    label: "Tes No",
    aliases: ["Tes No", "TesNo", "TES NO", "OC No", "OC Number"],
    required: true,
  },
  {
    label: "Name",
    aliases: ["Name"],
    required: true,
  },
  {
    label: "Course",
    aliases: ["Course", "Course Code", "Course Name"],
    required: true,
  },
  {
    label: "Dt of Arrival",
    aliases: ["Dt of Arrival", "Date of Arrival", "DOA"],
    required: true,
  },
  {
    label: "Platoon",
    aliases: ["Platoon", "PlatoonId", "Platoon Id", "PL", "Pl"],
    required: false,
  },
  {
    label: "E mail",
    aliases: ["E mail", "Email"],
    required: false,
  },
  {
    label: "PAN Card No",
    aliases: ["PAN Card No", "PAN No"],
    required: false,
  },
  {
    label: "Aadhar No",
    aliases: ["Aadhar No", "Aadhaar No"],
    required: false,
  },
  {
    label: "UPSC Roll No",
    aliases: ["UPSC Roll No"],
    required: false,
  },
  {
    label: "DOB",
    aliases: ["DOB", "Date of Birth"],
    required: false,
  },
  {
    label: "Place of Birth",
    aliases: ["Place of Birth"],
    required: false,
  },
  {
    label: "Domicile",
    aliases: ["Domicile"],
    required: false,
  },
  {
    label: "Religion",
    aliases: ["Religion"],
    required: false,
  },
  {
    label: "Nationality",
    aliases: ["Nationality"],
    required: false,
  },
  {
    label: "Blood GP",
    aliases: ["Blood GP", "Blood Group", "Blood Gp"],
    required: false,
  },
  {
    label: "Iden Marks",
    aliases: ["Iden Marks", "Identification Marks"],
    required: false,
  },
  {
    label: "Father's Name",
    aliases: ["Father's Name", "Fathers Name"],
    required: false,
  },
  {
    label: "Father's Mobile",
    aliases: ["Father's Mobile", "Father's Mobile No", "Fathers Mobile"],
    required: false,
  },
  {
    label: "Father's Address",
    aliases: ["Father's Address", "Father Address"],
    required: false,
  },
  {
    label: "Father's Profession",
    aliases: ["Father's Profession", "Father Profession"],
    required: false,
  },
  {
    label: "Guardian Name",
    aliases: ["Guardian Name", "Guardian's Name"],
    required: false,
  },
  {
    label: "Guardian's Address",
    aliases: ["Guardian's Address", "Guardian'sAddress", "Guardian Address"],
    required: false,
  },
  {
    label: "Income(parents)",
    aliases: ["Income(parents)", "Monthly Income"],
    required: false,
  },
  {
    label: "Detls of NOK",
    aliases: ["Detls of NOK", "Details of NOK"],
    required: false,
  },
  {
    label: "Permanent & Present Address",
    aliases: ["Permanent & Present Address"],
    required: false,
  },
  {
    label: "Nearest RLY Stn",
    aliases: ["Nearest RLY Stn", "Nearest Railway Station"],
    required: false,
  },
  {
    label: "Address of Family/Friends in Secunderabad",
    aliases: [
      "Address of Family/Friends in Secunderabad",
      "Address of Family/Friends in Secunderbad",
      "Secunderabad Addr",
    ],
    required: false,
  },
  {
    label: "RK Name & Relan of near Relative in Armed force",
    aliases: ["RK Name & Relan of near Relative in Armed force", "Relative Armed Forces"],
    required: false,
  },
  {
    label: "Govt Fin Asst Mob No",
    aliases: ["Govt Fin Asst Mob No"],
    required: false,
  },
  {
    label: "Passport No",
    aliases: ["Passport No"],
    required: false,
  },
  {
    label: "Bank Detail",
    aliases: ["Bank Detail", "Bank Details"],
    required: false,
  },
  {
    label: "Iden card No",
    aliases: ["Iden card No", "Id Card No"],
    required: false,
  },
  {
    label: "SSB Centre",
    aliases: ["SSB Centre"],
    required: false,
  },
  {
    label: "Games",
    aliases: ["Games"],
    required: false,
  },
  {
    label: "Hobbies",
    aliases: ["Hobbies"],
    required: false,
  },
  {
    label: "Swimmer/Non Swimmer",
    aliases: ["Swimmer/Non Swimmer", "Swimmer Status"],
    required: false,
  },
  {
    label: "Language",
    aliases: ["Language", "Languages"],
    required: false,
  },
  {
    label: "Visible Iden Mks",
    aliases: ["Visible Iden Mks", "Visible Ident Marks"],
    required: false,
  },
  {
    label: "PI",
    aliases: ["PI"],
    required: false,
  },
];

export const OC_BULK_REQUIRED_FIELD_GROUPS = OC_BULK_FIELD_GROUPS.filter((group) => group.required);

export const OC_BULK_SAMPLE_HEADERS = OC_BULK_FIELD_GROUPS.map((group) => group.label);

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
      invalidHeaders?: string[];
    };

export type OCBulkUploadPreviewPreparation =
  | {
      ok: true;
      rawRows: RawRow[];
      previewRows: UploadedPreviewRow[];
      highlightSampleFormat: false;
    }
  | {
      ok: false;
      title: string;
      message: string;
      highlightSampleFormat: true;
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

function collectHeaderPairs(rows: RawRow[]): Array<{ original: string; normalized: string }> {
  const pairs: Array<{ original: string; normalized: string }> = [];
  const seen = new Set<string>();

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      const original = key.trim();
      const normalized = normalizeOCBulkHeader(original);
      if (!original || !normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      pairs.push({ original, normalized });
    }
  }

  return pairs;
}

function hasAnyAlias(headers: Set<string>, aliases: string[]): boolean {
  return aliases.some((alias) => headers.has(normalizeOCBulkHeader(alias)));
}

function isKnownOCBulkHeader(normalizedHeader: string): boolean {
  return OC_BULK_FIELD_GROUPS.some((group) =>
    group.aliases.some((alias) => normalizeOCBulkHeader(alias) === normalizedHeader)
  );
}

export function getOCBulkRequiredColumnsText(): string {
  return OC_BULK_REQUIRED_FIELD_GROUPS.map((group) => group.label).join(", ");
}

export function getOCBulkAcceptedColumnsText(): string {
  return OC_BULK_SAMPLE_HEADERS.join(", ");
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
  const invalidHeaders = collectHeaderPairs(nonEmptyRows)
    .filter((header) => !isKnownOCBulkHeader(header.normalized))
    .map((header) => header.original);

  if (invalidHeaders.length > 0) {
    return {
      ok: false,
      title: "Wrong OC bulk upload format",
      invalidHeaders,
      message: `Wrong OC bulk upload format. These column heading${
        invalidHeaders.length === 1 ? " is" : "s are"
      } not accepted: ${invalidHeaders.join(", ")}. Open "View Sample Format" and use only these accepted headings: ${getOCBulkAcceptedColumnsText()}.`,
    };
  }

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

export function prepareOCBulkUploadPreview(rows: RawRow[]): OCBulkUploadPreviewPreparation {
  const validation = validateOCBulkUploadRows(rows);
  if (!validation.ok) {
    return {
      ok: false,
      title: validation.title,
      message: validation.message,
      highlightSampleFormat: true,
    };
  }

  const parsed = validation.nonEmptyRows
    .map((rawRow) => ({ rawRow, previewRow: toOCBulkPreviewRow(rawRow) }))
    .filter(({ previewRow }) => previewRow.name || previewRow.tesNo || previewRow.course);

  if (parsed.length === 0) {
    return {
      ok: false,
      title: "Invalid upload format",
      message:
        "No usable OC rows were found. Fill TES No, Name, Course, and Dt of Arrival for each OC before uploading again.",
      highlightSampleFormat: true,
    };
  }

  return {
    ok: true,
    rawRows: parsed.map((entry) => entry.rawRow),
    previewRows: parsed.map((entry) => entry.previewRow),
    highlightSampleFormat: false,
  };
}
