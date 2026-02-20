"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { relegationApi, type RelegationEnrollmentModuleKey } from "@/app/lib/api/relegationApi";
import { useRelegationEnrollments } from "@/hooks/useRelegation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const MODULE_OPTIONS: Array<{ value: RelegationEnrollmentModuleKey; label: string }> = [
  { value: "academics", label: "Academics" },
  { value: "olq", label: "OLQ" },
  { value: "interviews", label: "Interviews" },
  { value: "pt_scores", label: "PT Scores" },
  { value: "pt_motivation", label: "PT Motivation" },
  { value: "spr", label: "SPR" },
  { value: "sports_games", label: "Sports & Games" },
  { value: "motivation_awards", label: "Motivation Awards" },
  { value: "weapon_training", label: "Weapon Training" },
  { value: "obstacle_training", label: "Obstacle Training" },
  { value: "speed_march", label: "Speed March" },
  { value: "drill", label: "Drill" },
  { value: "camps", label: "Camps" },
  { value: "discipline", label: "Discipline" },
  { value: "clubs", label: "Clubs" },
  { value: "leave_hike_detention", label: "Leave/Hike/Detention" },
  { value: "counselling", label: "Counselling" },
  { value: "cfe", label: "CFE" },
];

type EnrollmentHistoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ocId: string | null;
  ocName: string | null;
};

export default function EnrollmentHistoryDialog({
  open,
  onOpenChange,
  ocId,
  ocName,
}: EnrollmentHistoryDialogProps) {
  const [enrollmentId, setEnrollmentId] = useState<string>("");
  const [module, setModule] = useState<RelegationEnrollmentModuleKey>("academics");
  const [semester, setSemester] = useState<string>("all");

  const enrollmentsQuery = useRelegationEnrollments(open ? ocId : null);

  useEffect(() => {
    if (!open) return;
    const firstId = enrollmentsQuery.data?.[0]?.id ?? "";
    if (!enrollmentId && firstId) {
      setEnrollmentId(firstId);
    }
  }, [open, enrollmentId, enrollmentsQuery.data]);

  useEffect(() => {
    if (!open) {
      setEnrollmentId("");
      setModule("academics");
      setSemester("all");
    }
  }, [open]);

  const moduleQuery = useQuery({
    queryKey: ["relegation", "enrollment-modules", ocId, enrollmentId, module, semester],
    enabled: open && Boolean(ocId && enrollmentId),
    queryFn: async () => {
      if (!ocId || !enrollmentId) return [];
      const response = await relegationApi.getEnrollmentModuleDataset({
        ocId,
        enrollmentId,
        module,
        semester: semester === "all" ? undefined : Number(semester),
      });
      return response.items ?? [];
    },
  });

  const preview = useMemo(() => {
    const rows = moduleQuery.data ?? [];
    return JSON.stringify(rows, null, 2);
  }, [moduleQuery.data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Enrollment History</DialogTitle>
          <DialogDescription>
            {ocName ? `Viewing historical enrollment datasets for ${ocName}.` : "Viewing historical enrollment datasets."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label>Enrollment</Label>
            <Select value={enrollmentId} onValueChange={setEnrollmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select enrollment" />
              </SelectTrigger>
              <SelectContent>
                {(enrollmentsQuery.data ?? []).map((enrollment) => (
                  <SelectItem key={enrollment.id} value={enrollment.id}>
                    {enrollment.courseCode} | {enrollment.status} | {new Date(enrollment.startedOn).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Module</Label>
            <Select value={module} onValueChange={(value) => setModule(value as RelegationEnrollmentModuleKey)}>
              <SelectTrigger>
                <SelectValue placeholder="Select module" />
              </SelectTrigger>
              <SelectContent>
                {MODULE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Semester</Label>
            <Select value={semester} onValueChange={setSemester}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="6">6</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3">
          {enrollmentsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading enrollments...</p>
          ) : moduleQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading dataset...</p>
          ) : (
            <pre className="max-h-[420px] overflow-auto text-xs">{preview || "[]"}</pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
