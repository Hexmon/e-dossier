"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchOCByIdFull, OCRecord } from "@/app/lib/api/ocApi";

type Props = {
  open: boolean;
  ocId: string | null;
  onOpenChange: (v: boolean) => void;
};

export interface FullOCRecord extends OCRecord {
  courseCode?: string;
  courseTitle?: string;
  platoonKey?: string | null;
  platoonName?: string | null;

  status?: "ACTIVE" | "DELEGATED" | "WITHDRAWN" | "PASSED_OUT";
  managerUserId?: string | null;
  relegateToCourseId?: string | null;
  relegatedOn?: string | null;
  updatedAt?: string;

  personal?: Record<string, unknown> | null;
  preCommission?: Record<string, unknown> | null;
  commissioning?: Record<string, unknown> | null;
  autobiography?: Record<string, unknown> | null;

  familyMembers?: Record<string, unknown>[];
  education?: Record<string, unknown>[];
  achievements?: Record<string, unknown>[];
  ssbReports?: Array<Record<string, unknown>>;
  medicals?: Record<string, unknown>[];
  medicalCategory?: Record<string, unknown>[];
  discipline?: Record<string, unknown>[];
  parentComms?: Record<string, unknown>[];
  delegations?: Record<string, unknown>[];
}

function toLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

const HIDDEN_KEYS = new Set(["id", "ocid", "reportid", "authoruserid"]);

function normalizeKey(key: string): string {
  return key.replace(/[_\s-]+/g, "").toLowerCase();
}

function shouldHideKey(key: string): boolean {
  return HIDDEN_KEYS.has(normalizeKey(key));
}

function formatDateString(value: string): string | null {
  const dateLikePattern = /(\d{4}-\d{2}-\d{2})([T\s].*)?|(\d{2}[/-]\d{2}[/-]\d{4})/;
  if (!dateLikePattern.test(value)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB");
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return formatDateString(value) ?? value;
  if (Array.isArray(value)) {
    if (!value.length) return "-";
    const allPrimitive = value.every((v) => v === null || ["string", "number", "boolean"].includes(typeof v));
    if (allPrimitive) return value.map((v) => formatCellValue(v)).join(", ");
    return `${value.length} item(s)`;
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function KeyValueTable({ data }: { data: Record<string, unknown> | null | undefined }) {
  const entries = data
    ? Object.entries(data).filter(([key]) => !shouldHideKey(key))
    : [];
  if (!entries.length) {
    return <p className="text-sm text-muted-foreground">No data available.</p>;
  }

  return (
    <div className="rounded-md border">
      <table className="w-full text-sm table-fixed">
        <thead className="bg-muted/40">
          <tr>
            <th className="px-3 py-2 text-left font-medium w-64">Field</th>
            <th className="px-3 py-2 text-left font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key} className="border-t">
              <td className="px-3 py-2 align-top font-medium">{toLabel(key)}</td>
              <td className="px-3 py-2 align-top break-words">{formatCellValue(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecordsTable({ rows }: { rows: Record<string, unknown>[] | null | undefined }) {
  const cleanedRows = (rows ?? [])
    .map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => !shouldHideKey(key))))
    .filter((row) => Object.keys(row).length > 0);

  if (cleanedRows.length === 0) {
    return <p className="text-sm text-muted-foreground">No records available.</p>;
  }

  return (
    <div className="space-y-4">
      {cleanedRows.map((row, idx) => (
        <div key={idx} className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Record {idx + 1}</div>
          <KeyValueTable data={row} />
        </div>
      ))}
    </div>
  );
}

export default function OCDetailsModal({ open, ocId, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [oc, setOc] = useState<FullOCRecord | null>(null);

  useEffect(() => {
    if (!open || !ocId) {
      setOc(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setOc(null);
    setLoading(true);
    fetchOCByIdFull(ocId)
      .then((data) => {
        if (!cancelled) setOc(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, ocId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] max-w-[1700px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>OC Details</DialogTitle>
        </DialogHeader>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && !oc && <p className="text-sm text-muted-foreground">Not found.</p>}
        {!loading && oc && (
          <div className="space-y-6 text-sm">
            <section className="grid grid-cols-2 gap-4">
              <div><div className="font-medium">Name</div><div>{oc.name}</div></div>
              <div><div className="font-medium">TES No</div><div>{oc.ocNo}</div></div>
              <div><div className="font-medium">Course</div><div>{oc.courseCode ?? oc.courseTitle ?? oc.course?.id ?? "-"}</div></div>
              <div><div className="font-medium">Platoon</div><div>{oc.platoonName ?? oc.platoonKey ?? oc.platoonId ?? "-"}</div></div>
              <div><div className="font-medium">Branch</div><div>{oc.branch ?? "-"}</div></div>
              <div><div className="font-medium">Status</div><div>{oc.status ?? "-"}</div></div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">Personal</h4>
              <KeyValueTable data={oc.personal ?? null} />
            </section>

            <section>
              <h4 className="font-semibold mb-2">Education</h4>
              <RecordsTable rows={oc.education ?? []} />
            </section>

            <section>
              <h4 className="font-semibold mb-2">Achievements</h4>
              <RecordsTable rows={oc.achievements ?? []} />
            </section>

            <section>
              <h4 className="font-semibold mb-2">Medicals</h4>
              <RecordsTable rows={oc.medicals ?? []} />
            </section>

            <section>
              <h4 className="font-semibold mb-2">Discipline</h4>
              <RecordsTable rows={oc.discipline ?? []} />
            </section>

            <section>
              <h4 className="font-semibold mb-2">SSB Reports</h4>
              {oc.ssbReports && oc.ssbReports.length > 0 ? (
                <div className="space-y-4">
                  {oc.ssbReports.map((report, idx) => {
                    const { points, ...reportFields } = report;
                    return (
                      <div key={idx} className="space-y-2 rounded-md border p-3">
                        <h5 className="font-medium">Report {idx + 1}</h5>
                        <KeyValueTable data={reportFields} />
                        <div>
                          <h6 className="font-medium mb-2">Points</h6>
                          <RecordsTable rows={Array.isArray(points) ? (points as Record<string, unknown>[]) : []} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No records available.</p>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
