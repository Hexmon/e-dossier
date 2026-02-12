"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { toDisplayDMY } from "@/app/lib/dateUtils";
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
};

export default function UploadButton({ disabled, onParsed, onParsingStateChange, label = "Upload CSV / Excel" }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const openAlert = (message: string) => {
    setAlertMessage(message);
    setAlertOpen(true);
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
    const raw = rows.filter((r) => Object.values(r).some((v) => String(v ?? "").trim() !== ""));
    const preview = raw.map(toPreviewRow).filter((r) => r.name || r.tesNo || r.course);
    onParsed(raw, preview);
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
      openAlert("Unsupported file type! Please upload CSV or Excel.");
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
      <Button className="bg-success cursor-pointer" disabled={disabled} onClick={() => inputRef.current?.click()}>
        {label}
      </Button>

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
