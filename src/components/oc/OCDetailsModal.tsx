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
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
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
              <div><div className="font-medium">Course</div><div>{oc.courseCode ?? oc.courseTitle ?? oc.courseId}</div></div>
              <div><div className="font-medium">Platoon</div><div>{oc.platoonName ?? oc.platoonKey ?? oc.platoonId ?? "-"}</div></div>
              <div><div className="font-medium">Branch</div><div>{oc.branch ?? "-"}</div></div>
              <div><div className="font-medium">Status</div><div>{oc.status ?? "-"}</div></div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">Personal</h4>
              <pre className="bg-muted/40 p-3 rounded overflow-x-auto">{JSON.stringify(oc.personal ?? {}, null, 2)}</pre>
            </section>

            <section className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Education</h4>
                <pre className="bg-muted/40 p-3 rounded overflow-x-auto">{JSON.stringify(oc.education ?? [], null, 2)}</pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Achievements</h4>
                <pre className="bg-muted/40 p-3 rounded overflow-x-auto">{JSON.stringify(oc.achievements ?? [], null, 2)}</pre>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Medicals</h4>
                <pre className="bg-muted/40 p-3 rounded overflow-x-auto">{JSON.stringify(oc.medicals ?? [], null, 2)}</pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Discipline</h4>
                <pre className="bg-muted/40 p-3 rounded overflow-x-auto">{JSON.stringify(oc.discipline ?? [], null, 2)}</pre>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">SSB Reports</h4>
              <pre className="bg-muted/40 p-3 rounded overflow-x-auto">{JSON.stringify(oc.ssbReports ?? [], null, 2)}</pre>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
