"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiClientError } from "@/app/lib/apiClient";
import {
    assignOfferings,
    listOfferings,
    type AssignOfferingsRequest,
} from "@/app/lib/api/offeringsApi";
import type { UICourse } from "@/hooks/useCourses";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface AssignOfferingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    courses: UICourse[];
}

type SubjectOption = {
    subjectId: string;
    label: string;
};

function formatCourseLabel(course: UICourse): string {
    return course.courseNo ? `Course ${course.courseNo}` : `Course ${course.id.slice(0, 8)}`;
}

export default function AssignOfferingsDialog({
    open,
    onOpenChange,
    courses,
}: AssignOfferingsDialogProps) {
    const queryClient = useQueryClient();
    const [targetCourseId, setTargetCourseId] = useState("");
    const [sourceCourseId, setSourceCourseId] = useState("");
    const [semesterFilter, setSemesterFilter] = useState<string>("all");
    const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

    const sortedCourses = useMemo(
        () => [...courses].sort((a, b) => (a.courseNo ?? "").localeCompare(b.courseNo ?? "")),
        [courses]
    );

    const semester = semesterFilter === "all" ? undefined : Number(semesterFilter);

    const previewQuery = useQuery({
        queryKey: ["assign-offerings-preview", sourceCourseId, semester],
        queryFn: async () => {
            const res = await listOfferings(sourceCourseId, { semester });
            return res.offerings;
        },
        enabled: open && Boolean(sourceCourseId),
        staleTime: 0,
    });

    const subjectOptions = useMemo<SubjectOption[]>(() => {
        const map = new Map<string, string>();
        for (const offering of previewQuery.data ?? []) {
            if (!offering.subjectId) continue;
            const label = offering.subjectCode && offering.subjectName
                ? `${offering.subjectCode} - ${offering.subjectName}`
                : offering.subjectName || offering.subjectCode || offering.subjectId;
            map.set(offering.subjectId, label);
        }

        return Array.from(map.entries())
            .map(([subjectId, label]) => ({ subjectId, label }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [previewQuery.data]);

    useEffect(() => {
        if (!open) return;
        setSelectedSubjectIds(subjectOptions.map((subject) => subject.subjectId));
    }, [open, sourceCourseId, semesterFilter, subjectOptions]);

    const resetState = () => {
        setTargetCourseId("");
        setSourceCourseId("");
        setSemesterFilter("all");
        setSelectedSubjectIds([]);
    };

    const assignMutation = useMutation({
        mutationFn: async () => {
            const request: AssignOfferingsRequest = {
                sourceCourseId,
                mode: "copy",
                semester,
                subjectIds:
                    subjectOptions.length > 0 && selectedSubjectIds.length !== subjectOptions.length
                        ? selectedSubjectIds
                        : undefined,
            };
            return assignOfferings(targetCourseId, request);
        },
        onSuccess: async (result) => {
            await queryClient.invalidateQueries({ queryKey: ["offerings", targetCourseId] });
            toast.success(`Offerings assigned. Created ${result.createdCount}, skipped ${result.skippedCount}.`);
            onOpenChange(false);
            resetState();
        },
        onError: (error) => {
            const message =
                error instanceof ApiClientError
                    ? error.message
                    : "Failed to assign offerings.";
            toast.error(message);
        },
    });

    const isSameCourse = Boolean(targetCourseId) && targetCourseId === sourceCourseId;
    const hasSelectableSubjects = subjectOptions.length > 0;
    const canSubmit =
        Boolean(targetCourseId) &&
        Boolean(sourceCourseId) &&
        !isSameCourse &&
        (!hasSelectableSubjects || selectedSubjectIds.length > 0) &&
        !assignMutation.isPending;

    const toggleSubject = (subjectId: string, checked: boolean) => {
        if (checked) {
            setSelectedSubjectIds((current) => (current.includes(subjectId) ? current : [...current, subjectId]));
            return;
        }
        setSelectedSubjectIds((current) => current.filter((id) => id !== subjectId));
    };

    const allSelected = hasSelectableSubjects && selectedSubjectIds.length === subjectOptions.length;

    const handleOpenChange = (next: boolean) => {
        if (assignMutation.isPending) return;
        onOpenChange(next);
        if (!next) {
            resetState();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Assign Offerings</DialogTitle>
                    <DialogDescription>
                        Copy offerings from one course to another. Existing target offerings with the same
                        subject and semester are skipped automatically.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="target-course">Target Course</Label>
                        <Select value={targetCourseId} onValueChange={setTargetCourseId}>
                            <SelectTrigger id="target-course">
                                <SelectValue placeholder="Select target course" />
                            </SelectTrigger>
                            <SelectContent>
                                {sortedCourses.map((course) => (
                                    <SelectItem key={course.id} value={course.id}>
                                        {formatCourseLabel(course)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="source-course">Source Course</Label>
                        <Select value={sourceCourseId} onValueChange={setSourceCourseId}>
                            <SelectTrigger id="source-course">
                                <SelectValue placeholder="Select source course" />
                            </SelectTrigger>
                            <SelectContent>
                                {sortedCourses.map((course) => (
                                    <SelectItem key={course.id} value={course.id}>
                                        {formatCourseLabel(course)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="semester-filter">Semester (Optional Filter)</Label>
                    <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                        <SelectTrigger id="semester-filter" className="w-full md:w-56">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Semesters</SelectItem>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                                <SelectItem key={sem} value={String(sem)}>
                                    Semester {sem}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {isSameCourse ? (
                    <p className="text-sm text-destructive">
                        Source and target courses must be different.
                    </p>
                ) : null}

                <div className="space-y-3 rounded-md border border-border p-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Preview & Subject Filter</h4>
                        {previewQuery.isFetching ? (
                            <span className="text-xs text-muted-foreground">Loading preview...</span>
                        ) : (
                            <span className="text-xs text-muted-foreground">
                                {previewQuery.data?.length ?? 0} offering(s)
                            </span>
                        )}
                    </div>

                    {!sourceCourseId ? (
                        <p className="text-sm text-muted-foreground">Select a source course to preview offerings.</p>
                    ) : previewQuery.isError ? (
                        <p className="text-sm text-destructive">Unable to load offerings preview.</p>
                    ) : previewQuery.isFetching ? (
                        <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : (previewQuery.data?.length ?? 0) === 0 ? (
                        <p className="text-sm text-muted-foreground">No offerings available for the selected filters.</p>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="select-all-subjects"
                                    checked={allSelected}
                                    onCheckedChange={(checked) => {
                                        const value = checked === true;
                                        setSelectedSubjectIds(
                                            value ? subjectOptions.map((subject) => subject.subjectId) : []
                                        );
                                    }}
                                />
                                <Label htmlFor="select-all-subjects" className="cursor-pointer text-sm">
                                    Select all subjects
                                </Label>
                            </div>

                            <div className="max-h-36 space-y-2 overflow-y-auto rounded-md border border-border p-2">
                                {subjectOptions.map((subject) => {
                                    const checked = selectedSubjectIds.includes(subject.subjectId);
                                    const inputId = `subject-${subject.subjectId}`;
                                    return (
                                        <div key={subject.subjectId} className="flex items-center gap-2">
                                            <Checkbox
                                                id={inputId}
                                                checked={checked}
                                                onCheckedChange={(value) => toggleSubject(subject.subjectId, value === true)}
                                            />
                                            <Label htmlFor={inputId} className="cursor-pointer text-sm">
                                                {subject.label}
                                            </Label>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="max-h-44 overflow-y-auto rounded-md border border-border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/60 text-muted-foreground">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-medium">Subject</th>
                                            <th className="px-3 py-2 text-left font-medium">Semester</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(previewQuery.data ?? []).map((offering) => (
                                            <tr key={`${offering.subjectId}-${offering.semester}`} className="border-t border-border">
                                                <td className="px-3 py-2">
                                                    {offering.subjectCode
                                                        ? `${offering.subjectCode} - ${offering.subjectName ?? offering.subjectCode}`
                                                        : offering.subjectName ?? offering.subjectId}
                                                </td>
                                                <td className="px-3 py-2">Semester {offering.semester}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={assignMutation.isPending}
                        onClick={() => handleOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        disabled={!canSubmit}
                        onClick={() => assignMutation.mutate()}
                    >
                        {assignMutation.isPending ? "Assigning..." : "Confirm Assign"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
