"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listOfferings, type Offering, Subject as OfferingSubject } from "@/app/lib/api/offeringsApi";

type SubjectView = Pick<OfferingSubject, "id" | "code" | "name" | "branch">;

type Props = {
  open: boolean;
  courseId: string | null;
  courseName?: string | null;
  onOpenChange: (open: boolean) => void;
};

export default function CourseViewModal({
  open,
  courseId,
  courseName,
  onOpenChange,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<SubjectView[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !courseId) {
      setSubjects([]);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    listOfferings(courseId)
      .then((res) => {
        if (!active) return;
        const map = new Map<string, SubjectView>();
        const offerings = (res.offerings ?? []) as Offering[];
        offerings.forEach((offering) => {
          const subject: SubjectView | null =
            offering.subject ?? {
              id: offering.subjectId ?? "",
              code: offering.subjectCode ?? "",
              name: offering.subjectName ?? "",
              branch: "",
            };

          if (!subject || (!subject.id && !subject.code && !subject.name)) return;
          const key = subject.id ?? `${subject.code ?? ""}-${subject.name ?? ""}`;
          if (!map.has(key)) map.set(key, subject);
        });
        setSubjects(Array.from(map.values()));
      })
      .catch((err) => {
        console.error("Failed to load course subjects", err);
        if (!active) return;
        setError("Failed to load subjects.");
        setSubjects([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, courseId]);

  const displayName = courseName?.trim() || courseId || "-";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[900px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Course Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div>
            <div className="font-medium">Course Name</div>
            <div>{displayName}</div>
          </div>

          <section>
            <h4 className="font-semibold mb-2">Subjects</h4>
            {loading && <p className="text-sm text-muted-foreground">Loading subjects...</p>}
            {!loading && error && <p className="text-sm text-destructive">{error}</p>}
            {!loading && !error && subjects.length === 0 && (
              <p className="text-sm text-muted-foreground">No subjects found.</p>
            )}
            {!loading && !error && subjects.length > 0 && (
              <div className="rounded-md border">
                <table className="w-full text-sm table-fixed">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium w-32">Code</th>
                      <th className="px-3 py-2 text-left font-medium">Name</th>
                      <th className="px-3 py-2 text-left font-medium w-24">Branch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((subject) => (
                      <tr key={subject.id ?? `${subject.code}-${subject.name}`} className="border-t">
                        <td className="px-3 py-2 break-words">{subject.code ?? "-"}</td>
                        <td className="px-3 py-2 break-words">{subject.name ?? "-"}</td>
                        <td className="px-3 py-2 break-words">{subject.branch ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
