"use client";

import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { toDisplayDMY } from "@/app/lib/dateUtils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, FileSpreadsheet } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type RawRow = Record<string, unknown>;
export type UploadedPreviewRow = {
  name: string;
  tesNo: string;
  course?: string;
  branch?: string | null;
  platoon?: string | null;
  arrival: string; // DD-MMM-YYYY
};

type Props = {
  disabled?: boolean;
  onParsed: (raw: RawRow[], preview: UploadedPreviewRow[]) => void;
  onParsingStateChange?: (parsing: boolean) => void;
  label?: string;
  courseOptions?: Array<{ id: string; code?: string; title?: string }>;
  platoonOptions?: Array<{ id: string; key?: string; name?: string }>;
};

const SAMPLE_HEADERS = [
  "Tes No",
  "Name",
  "Course",
  "Dt of Arrival",
  "Platoon",
  "E mail",
  "PAN Card No",
  "Aadhar No",
  "UPSC Roll No",
  "DOB",
  "Place of Birth",
  "Domicile",
  "Religion",
  "Nationality",
  "Blood GP",
  "Iden Marks",
  "Father's Name",
  "Father's Mobile",
  "Father's Address",
  "Father's Profession",
  "Guardian Name",
  "Guardian's Address",
  "Income(parents)",
  "Detls of NOK",
  "Permanent & Present Address",
  "Nearest RLY Stn",
  "Address of Family/Friends in Secunderabad",
  "RK Name & Relan of near Relative in Armed force",
  "Govt Fin Asst Mob No",
  "Passport No",
  "Bank Detail",
  "Iden card No",
  "SSB Centre",
  "Games",
  "Hobbies",
  "Swimmer/Non Swimmer",
  "Language",
  "Visible Iden Mks",
  "PI",
] as const;

const SAMPLE_ROW: Record<(typeof SAMPLE_HEADERS)[number], string> = {
  "Tes No": "7501",
  "Name": "OC Example Cadet",
  "Course": "TES-51",
  "Dt of Arrival": "2026-01-10",
  "Platoon": "Arjun",
  "E mail": "oc.example@domain.com",
  "PAN Card No": "ABCDE1234F",
  "Aadhar No": "123412341234",
  "UPSC Roll No": "UPSC-12345",
  "DOB": "2003-05-11",
  "Place of Birth": "Jaipur",
  "Domicile": "Rajasthan",
  "Religion": "Hindu",
  "Nationality": "Indian",
  "Blood GP": "O+",
  "Iden Marks": "Mole on chin",
  "Father's Name": "Rajesh Kumar",
  "Father's Mobile": "9876543210",
  "Father's Address": "Jaipur, Rajasthan",
  "Father's Profession": "Govt Service",
  "Guardian Name": "Suresh Kumar",
  "Guardian's Address": "Jaipur, Rajasthan",
  "Income(parents)": "90000",
  "Detls of NOK": "Father",
  "Permanent & Present Address": "Perm Address / Present Address",
  "Nearest RLY Stn": "Jaipur Junction",
  "Address of Family/Friends in Secunderabad": "Trimulgherry, Secunderabad",
  "RK Name & Relan of near Relative in Armed force": "Col A Kumar (Uncle)",
  "Govt Fin Asst Mob No": "9876500000",
  "Passport No": "P1234567",
  "Bank Detail": "SBI A/C XXXX",
  "Iden card No": "ID-7788",
  "SSB Centre": "Allahabad",
  "Games": "Football",
  "Hobbies": "Reading",
  "Swimmer/Non Swimmer": "Swimmer",
  "Language": "English,Hindi",
  "Visible Iden Mks": "Scar on left hand",
  "PI": "PI-102",
};

type FieldInstruction = {
  field: string;
  required: "Yes" | "No";
  acceptedHeaders: string;
  expectedFormat: string;
  example: string;
  notes: string;
};

const FIELD_INSTRUCTIONS: FieldInstruction[] = [
  {
    field: "Tes No",
    required: "Yes",
    acceptedHeaders: "Tes No / TesNo / TES NO / OC No / OC Number",
    expectedFormat: "Unique text/number, no duplicate in file or DB",
    example: "7501",
    notes: "Must be unique. Existing TES No will fail.",
  },
  {
    field: "Name",
    required: "Yes",
    acceptedHeaders: "Name",
    expectedFormat: "Text",
    example: "OC Example Cadet",
    notes: "Cadet full name.",
  },
  {
    field: "Course",
    required: "Yes",
    acceptedHeaders: "Course / Course Code / Course Name",
    expectedFormat: "Existing course code/title from system",
    example: "TES-51",
    notes: "Course must already exist in DB.",
  },
  {
    field: "Dt of Arrival",
    required: "Yes",
    acceptedHeaders: "Dt of Arrival / Date of Arrival / DOA",
    expectedFormat: "Valid date (YYYY-MM-DD preferred)",
    example: "2026-01-10",
    notes: "Excel date serial also supported, but ISO date is safest.",
  },
  {
    field: "Platoon",
    required: "No",
    acceptedHeaders: "Platoon / PlatoonId / Platoon Id / PL / Pl",
    expectedFormat: "Existing platoon key/name/UUID",
    example: "Arjun",
    notes: "If value is present and not found, row fails.",
  },
  {
    field: "Email",
    required: "No",
    acceptedHeaders: "E mail / Email",
    expectedFormat: "Valid email text, unique",
    example: "oc.example@domain.com",
    notes: "Duplicate in file or DB fails.",
  },
  {
    field: "PAN",
    required: "No",
    acceptedHeaders: "PAN Card No / PAN No",
    expectedFormat: "Text, unique",
    example: "ABCDE1234F",
    notes: "Duplicate in file or DB fails.",
  },
  {
    field: "Aadhaar",
    required: "No",
    acceptedHeaders: "Aadhar No / Aadhaar No",
    expectedFormat: "Text/number, unique",
    example: "123412341234",
    notes: "Duplicate in file or DB fails.",
  },
  {
    field: "UPSC Roll No",
    required: "No",
    acceptedHeaders: "UPSC Roll No",
    expectedFormat: "Text/number, unique",
    example: "UPSC-12345",
    notes: "Duplicate in file or DB fails.",
  },
  {
    field: "DOB",
    required: "No",
    acceptedHeaders: "DOB / Date of Birth",
    expectedFormat: "Valid date (YYYY-MM-DD preferred)",
    example: "2003-05-11",
    notes: "Invalid date format fails row parsing for DOB.",
  },
  {
    field: "Income(parents)",
    required: "No",
    acceptedHeaders: "Income(parents) / Monthly Income",
    expectedFormat: "Numeric",
    example: "90000",
    notes: "Only numeric value should be provided.",
  },
  {
    field: "Swimmer/Non Swimmer",
    required: "No",
    acceptedHeaders: "Swimmer/Non Swimmer / Swimmer Status",
    expectedFormat: "Swimmer / Non Swimmer / Yes / No / True / False",
    example: "Swimmer",
    notes: "Case-insensitive values are accepted.",
  },
  {
    field: "Govt Fin Asst Mob No",
    required: "No",
    acceptedHeaders: "Govt Fin Asst Mob No",
    expectedFormat: "Mobile number text",
    example: "9876500000",
    notes: "If present, financial assistance is marked true.",
  },
];

function toCsvCell(value: string): string {
  const safe = value.replace(/"/g, '""');
  return `"${safe}"`;
}

export default function UploadButton({
  disabled,
  onParsed,
  onParsingStateChange,
  label = "Upload CSV / Excel",
  courseOptions = [],
  platoonOptions = [],
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [sampleOpen, setSampleOpen] = useState(false);

  const sortedCourseOptions = useMemo(
    () =>
      [...courseOptions].sort((a, b) =>
        `${a.code ?? ""} ${a.title ?? ""}`.localeCompare(`${b.code ?? ""} ${b.title ?? ""}`)
      ),
    [courseOptions]
  );

  const sortedPlatoonOptions = useMemo(
    () => [...platoonOptions].sort((a, b) => `${a.key ?? ""} ${a.name ?? ""}`.localeCompare(`${b.key ?? ""} ${b.name ?? ""}`)),
    [platoonOptions]
  );

  const openAlert = (message: string) => {
    setAlertMessage(message);
    setAlertOpen(true);
  };

  const downloadSampleCsv = () => {
    const headerLine = SAMPLE_HEADERS.map((h) => toCsvCell(h)).join(",");
    const rowLine = SAMPLE_HEADERS.map((h) => toCsvCell(SAMPLE_ROW[h] ?? "")).join(",");
    const csv = `${headerLine}\n${rowLine}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "oc-bulk-upload-sample.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const norm = (s: string) => s.toLowerCase().replace(/['`’]/g, "'").replace(/[^a-z0-9]+/g, " ").trim();
  const pick = (row: RawRow, aliases: string[]): unknown => {
    const map: Record<string, unknown> = {};
    Object.keys(row).forEach((k) => (map[norm(k)] = (row as any)[k]));
    for (const a of aliases) {
      const v = map[norm(a)];
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
    return undefined;
  };

  const toPreviewRow = (row: RawRow): UploadedPreviewRow => {
    const arrivalRaw = pick(row, ["Dt of Arrival", "Date of Arrival", "DOA"]);
    return {
      name: String(pick(row, ["Name"]) ?? ""),
      tesNo: String(pick(row, ["Tes No", "TesNo", "TES NO", "OC No", "OC Number"]) ?? ""),
      course: String(pick(row, ["Course", "Course Code", "Course Name"]) ?? ""),
      branch: (pick(row, ["Branch"]) as string | null | undefined) ?? null,
      platoon: (pick(row, ["Platoon", "PlatoonId"]) as string | null | undefined) ?? null,
      arrival: toDisplayDMY(arrivalRaw),
    };
  };

  const acceptRows = (rows: RawRow[]) => {
    const parsed = rows
      .filter((r) => Object.values(r).some((v) => String(v ?? "").trim() !== ""))
      .map((rawRow) => ({ rawRow, previewRow: toPreviewRow(rawRow) }))
      .filter(({ previewRow }) => previewRow.name || previewRow.tesNo || previewRow.course);

    onParsed(
      parsed.map((entry) => entry.rawRow),
      parsed.map((entry) => entry.previewRow)
    );
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    onParsingStateChange?.(true);

    if (fileName.endsWith(".csv")) {
      Papa.parse<RawRow>(file, {
        header: true,
        complete: (results) => {
          acceptRows(results.data as RawRow[]);
          onParsingStateChange?.(false);
        },
        error: () => onParsingStateChange?.(false),
      });
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array", cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = XLSX.utils.sheet_to_json<RawRow>(workbook.Sheets[sheetName], { raw: true });
          acceptRows(worksheet);
        } finally {
          onParsingStateChange?.(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      onParsingStateChange?.(false);
      openAlert("Unsupported file type. Allowed files: .csv, .xlsx, .xls");
    }

    // reset so same file can be chosen again
    e.currentTarget.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv, .xlsx, .xls"
        className="hidden"
        onChange={onChange}
      />
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="cursor-pointer"
          onClick={() => setSampleOpen(true)}
          type="button"
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          View Sample Format
        </Button>
        <Button className="bg-success cursor-pointer" disabled={disabled} onClick={() => inputRef.current?.click()}>
          {label}
        </Button>
      </div>

      <Dialog open={sampleOpen} onOpenChange={setSampleOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[95vw] lg:max-w-[90vw] max-h-[92vh] overflow-hidden p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle>OC Bulk Upload Sample Format</DialogTitle>
            <DialogDescription>
              Required columns: <span className="font-medium">Tes No, Name, Course, Dt of Arrival</span>. Optional columns are supported as shown below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto px-6 pb-4 min-h-0 flex-1">
            <div className="rounded-md border bg-muted/30 p-3 text-xs leading-5 space-y-2">
              <p className="font-semibold text-sm">1. File Requirements</p>
              <p>Allowed file types: <span className="font-medium">.csv, .xlsx, .xls</span> only.</p>
              <p>Keep header names exactly from sample or use the accepted aliases listed in Field Instructions.</p>
              <p>Use <span className="font-medium">YYYY-MM-DD</span> for date fields to avoid parsing errors.</p>
              <p>Run <span className="font-medium">Validate (Dry Run)</span> first before final upload.</p>
              <p>Keep unique values for TES No, Email, PAN, Aadhaar, UPSC Roll No.</p>
            </div>

            <div className="rounded-md border bg-muted/20 p-3 text-xs leading-5 space-y-2">
              <p className="font-semibold text-sm">2. Course Input Rules</p>
              <p>Course must match an existing course from the list below (by code or title).</p>
              <p>If your course is not visible in this list, ask admin to create it first in Course Management before bulk upload.</p>
            </div>

            <div className="overflow-auto border rounded-md">
              <table className="min-w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left border-b whitespace-nowrap">Course Code</th>
                    <th className="px-3 py-2 text-left border-b whitespace-nowrap">Course Title</th>
                    <th className="px-3 py-2 text-left border-b whitespace-nowrap">Course UUID</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCourseOptions.length > 0 ? (
                    sortedCourseOptions.map((course) => (
                      <tr key={course.id}>
                        <td className="px-3 py-2 border-b whitespace-nowrap font-medium">{course.code ?? "-"}</td>
                        <td className="px-3 py-2 border-b whitespace-nowrap">{course.title ?? "-"}</td>
                        <td className="px-3 py-2 border-b whitespace-nowrap">{course.id}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-3 py-2 border-b text-muted-foreground" colSpan={3}>
                        No courses loaded. Refresh page and reopen this dialog.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="rounded-md border bg-muted/20 p-3 text-xs leading-5 space-y-2">
              <p className="font-semibold text-sm">3. Platoon Input Rules</p>
              <p>You can put any one exact value: <span className="font-medium">Platoon Key</span> OR <span className="font-medium">Platoon Name</span> OR <span className="font-medium">Platoon UUID</span>.</p>
              <p>Use exact spelling from the table below to avoid row failure.</p>
            </div>

            <div className="overflow-auto border rounded-md">
              <table className="min-w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left border-b whitespace-nowrap">Platoon Key</th>
                    <th className="px-3 py-2 text-left border-b whitespace-nowrap">Platoon Name</th>
                    <th className="px-3 py-2 text-left border-b whitespace-nowrap">Platoon UUID</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPlatoonOptions.length > 0 ? (
                    sortedPlatoonOptions.map((pl) => (
                      <tr key={pl.id}>
                        <td className="px-3 py-2 border-b whitespace-nowrap font-medium">{pl.key ?? "-"}</td>
                        <td className="px-3 py-2 border-b whitespace-nowrap">{pl.name ?? "-"}</td>
                        <td className="px-3 py-2 border-b whitespace-nowrap">{pl.id}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-3 py-2 border-b text-muted-foreground" colSpan={3}>
                        No platoons loaded. Refresh page and reopen this dialog.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="rounded-md border bg-muted/20 p-3 text-xs leading-5 space-y-2">
              <p className="font-semibold text-sm">4. Sample Sheet</p>
              <p>Use this structure for CSV/Excel columns. Keep required columns filled in every row.</p>
            </div>
            <div className="overflow-auto border rounded-md">
              <table className="min-w-max text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    {SAMPLE_HEADERS.map((h) => (
                      <th key={h} className="px-3 py-2 text-left border-b whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {SAMPLE_HEADERS.map((h) => (
                      <td key={h} className="px-3 py-2 border-b whitespace-nowrap">
                        {SAMPLE_ROW[h]}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="rounded-md border bg-muted/20 p-3 text-xs leading-5 space-y-2">
              <p className="font-semibold text-sm">5. Field-by-Field Instructions</p>
              <p>Follow accepted headers and expected format exactly. Incorrect format will fail dry-run/upload for that row.</p>
            </div>
            <div className="overflow-auto border rounded-md">
              <table className="min-w-max text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left border-b whitespace-nowrap">Field</th>
                    <th className="px-3 py-2 text-left border-b whitespace-nowrap">Required</th>
                    <th className="px-3 py-2 text-left border-b whitespace-nowrap">Accepted Headers</th>
                    <th className="px-3 py-2 text-left border-b whitespace-nowrap">Expected Format</th>
                    <th className="px-3 py-2 text-left border-b whitespace-nowrap">Example</th>
                    <th className="px-3 py-2 text-left border-b whitespace-nowrap">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {FIELD_INSTRUCTIONS.map((rule) => (
                    <tr key={rule.field}>
                      <td className="px-3 py-2 border-b whitespace-nowrap font-medium">{rule.field}</td>
                      <td className="px-3 py-2 border-b whitespace-nowrap">{rule.required}</td>
                      <td className="px-3 py-2 border-b">{rule.acceptedHeaders}</td>
                      <td className="px-3 py-2 border-b">{rule.expectedFormat}</td>
                      <td className="px-3 py-2 border-b whitespace-nowrap">{rule.example}</td>
                      <td className="px-3 py-2 border-b">{rule.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t shrink-0 bg-background">
            <Button type="button" variant="outline" onClick={downloadSampleCsv}>
              <Download className="mr-2 h-4 w-4" />
              Download Sample CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Notice</AlertDialogTitle>
            <AlertDialogDescription>{alertMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
