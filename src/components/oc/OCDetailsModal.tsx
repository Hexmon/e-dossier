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

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
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
  const entries = data ? Object.entries(data) : [];
  if (!entries.length) {
    return <p className="text-sm text-muted-foreground">No data available.</p>;
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="min-w-full text-sm">
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
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No records available.</p>;
  }

  const columns = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                {toLabel(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-t">
              {columns.map((col) => (
                <td key={`${idx}-${col}`} className="px-3 py-2 align-top break-words">
                  {formatCellValue(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function OCDetailsModal({ open, ocId, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [oc, setOc] = useState<FullOCRecord | null>(null);

  useEffect(() => {
    if (!open || !ocId) return;
    setLoading(true);
    fetchOCByIdFull(ocId)
      .then(setOc)
      .finally(() => setLoading(false));
  }, [open, ocId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[1500px] max-h-[90vh] overflow-y-auto">
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

            <section className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Education</h4>
                <RecordsTable rows={oc.education ?? []} />
              </div>
              <div>
                <h4 className="font-semibold mb-2">Achievements</h4>
                <RecordsTable rows={oc.achievements ?? []} />
              </div>
            </section>

            <section className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Medicals</h4>
                <RecordsTable rows={oc.medicals ?? []} />
              </div>
              <div>
                <h4 className="font-semibold mb-2">Discipline</h4>
                <RecordsTable rows={oc.discipline ?? []} />
              </div>
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
