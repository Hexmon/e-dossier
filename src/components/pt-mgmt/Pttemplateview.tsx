"use client";

import { useEffect, useState } from "react";
import { PTTemplate, PTTemplateCopyResponse } from "@/app/lib/api/Physicaltrainingapi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { PtTemplateApplyResult } from "@/app/lib/bootstrap/types";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { CourseResponse } from "@/app/lib/api/courseApi";

interface PTTemplateViewProps {
    template: PTTemplate | null;
    loading: boolean;
    currentCourseId: string;
    availableCourses: CourseResponse[];
    semester: number;
    onApplyDefaultTemplate?: (dryRun: boolean) => Promise<PtTemplateApplyResult>;
    onCopyTemplate?: (
        sourceCourseId: string,
        targetCourseId: string,
        semester: number,
    ) => Promise<PTTemplateCopyResponse>;
}

function ApplyResultSummary({ result }: { result: PtTemplateApplyResult }) {
    return (
        <div className="rounded-md border bg-muted/30 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">
                    {result.dryRun ? "Dry Run Summary" : "Apply Summary"}
                </span>
                <span className="text-muted-foreground">
                    Created: {result.createdCount} | Updated: {result.updatedCount} | Skipped:{" "}
                    {result.skippedCount}
                </span>
            </div>
            {result.warnings.length > 0 ? (
                <div className="mt-2">
                    <p className="font-medium">Warnings</p>
                    <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                        {result.warnings.map((warning, index) => (
                            <li key={`${index}-${warning}`}>{warning}</li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </div>
    );
}

export default function PTTemplateView({
    template,
    loading,
    currentCourseId,
    availableCourses,
    semester,
    onApplyDefaultTemplate,
    onCopyTemplate,
}: PTTemplateViewProps) {
    const [busyMode, setBusyMode] = useState<"dry-run" | "apply" | "copy" | null>(null);
    const [lastApplyResult, setLastApplyResult] = useState<PtTemplateApplyResult | null>(null);
    const [copySourceCourseId, setCopySourceCourseId] = useState("");
    const [copyTargetCourseId, setCopyTargetCourseId] = useState(currentCourseId);

    useEffect(() => {
        setCopyTargetCourseId(currentCourseId);
    }, [currentCourseId]);

    const runApply = async (dryRun: boolean) => {
        if (!onApplyDefaultTemplate) return;
        setBusyMode(dryRun ? "dry-run" : "apply");
        try {
            const result = await onApplyDefaultTemplate(dryRun);
            setLastApplyResult(result);
            toast.success(
                dryRun
                    ? "Dry run completed. Review the summary below."
                    : "Default PT template applied."
            );
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to apply default PT template."
            );
        } finally {
            setBusyMode(null);
        }
    };

    const runCopy = async () => {
        if (!onCopyTemplate || !copySourceCourseId || !copyTargetCourseId) return;
        setBusyMode("copy");
        try {
            const result = await onCopyTemplate(
                copySourceCourseId,
                copyTargetCourseId,
                semester,
            );
            toast.success(
                result.message ||
                    `PT template copied. Created: ${result.createdCount}, Updated: ${result.updatedCount}`
            );
            if (result.warnings.length > 0) {
                toast.warning(`Completed with ${result.warnings.length} warning(s).`);
            }
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Failed to copy PT template."
            );
        } finally {
            setBusyMode(null);
        }
    };

    const renderTemplateApplyActions = () => {
        if (!onApplyDefaultTemplate && !onCopyTemplate) return null;

        const loadingText =
            busyMode === "dry-run"
                ? "Running preview..."
                : busyMode === "apply"
                    ? "Applying template..."
                    : busyMode === "copy"
                        ? "Copying template..."
                    : null;

        const canCopy =
            Boolean(onCopyTemplate) &&
            copySourceCourseId.length > 0 &&
            copyTargetCourseId.length > 0 &&
            copySourceCourseId !== copyTargetCourseId;

        return (
            <Card>
                <CardHeader>
                    <CardTitle>Default PT Template Bootstrap</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Initialize semester-wise PT defaults (Sem 1-6) using upsert-missing
                        behavior. Existing custom rows are preserved.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {onApplyDefaultTemplate ? (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => void runApply(true)}
                                    disabled={busyMode !== null}
                                >
                                    {busyMode === "dry-run" ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Running Dry Run
                                        </>
                                    ) : (
                                        "Preview Changes (Dry Run)"
                                    )}
                                </Button>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button type="button" disabled={busyMode !== null}>
                                            Apply Default PT Template
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>
                                                Apply default PT template?
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This updates canonical PT template rows and creates missing
                                                defaults. It does not delete organization-specific entries.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => {
                                                    void runApply(false);
                                                }}
                                            >
                                                Confirm Apply
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </>
                        ) : null}
                    </div>

                    {onCopyTemplate ? (
                        <div className="space-y-4 rounded-md border p-4">
                            <div>
                                <p className="text-sm font-medium">Copy Existing PT Template</p>
                                <p className="text-xs text-muted-foreground">
                                    Replace the selected course PT configuration for semester {semester} with another course&apos;s template.
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="pt-copy-source">Source Course</Label>
                                    <Select value={copySourceCourseId} onValueChange={setCopySourceCourseId}>
                                        <SelectTrigger id="pt-copy-source">
                                            <SelectValue placeholder="Select source course" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableCourses.map((course) => (
                                                <SelectItem key={`source-${course.id}`} value={course.id}>
                                                    {course.code} - {course.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="pt-copy-target">Target Course</Label>
                                    <Select value={copyTargetCourseId} onValueChange={setCopyTargetCourseId}>
                                        <SelectTrigger id="pt-copy-target">
                                            <SelectValue placeholder="Select target course" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableCourses.map((course) => (
                                                <SelectItem key={`target-${course.id}`} value={course.id}>
                                                    {course.code} - {course.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {copySourceCourseId &&
                            copyTargetCourseId &&
                            copySourceCourseId === copyTargetCourseId ? (
                                <p className="text-xs text-destructive">
                                    Source and target courses must be different.
                                </p>
                            ) : null}

                            <div className="flex justify-end">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button type="button" variant="outline" disabled={!canCopy || busyMode !== null}>
                                            Copy PT Template
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Copy PT template in replace mode?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This replaces the target course PT template for semester {semester} with the selected
                                                source course configuration.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel disabled={busyMode !== null}>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                disabled={busyMode !== null}
                                                onClick={() => {
                                                    void runCopy();
                                                }}
                                            >
                                                {busyMode === "copy" ? "Copying..." : "Copy Now"}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                            ) : null}

                    {loadingText ? (
                        <p className="text-xs text-muted-foreground">{loadingText}</p>
                    ) : null}

                    {lastApplyResult ? <ApplyResultSummary result={lastApplyResult} /> : null}
                </CardContent>
            </Card>
        );
    };

    if (loading) {
        return (
            <div className="space-y-6">
                {renderTemplateApplyActions()}
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    if (!template || template.types.length === 0) {
        return (
            <div className="space-y-6">
                {renderTemplateApplyActions()}
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <p className="text-muted-foreground">
                                No template data found for Semester {semester}
                            </p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Add PT types in the PT Types tab to get started
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {renderTemplateApplyActions()}
            {template.types.map((type) => {
                const { id, code, title, maxTotalMarks, attempts, tasks } = type;

                return (
                    <Card key={id}>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>
                                    {code} - {title}
                                </span>
                                <span className="text-sm font-normal text-muted-foreground">
                                    Max: {maxTotalMarks} marks
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {tasks.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No tasks configured for this PT type
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left p-3 font-semibold">Task</th>
                                                <th className="text-center p-3 font-semibold">
                                                    Max Marks
                                                </th>
                                                {attempts.map((attempt) => {
                                                    const { id: attemptId, code: attemptCode, label, grades } = attempt;
                                                    return grades.map((grade) => {
                                                        const { code: gradeCode, label: gradeLabel } = grade;
                                                        return (
                                                            <th
                                                                key={`${attemptId}-${gradeCode}`}
                                                                className="text-center p-3 font-semibold border-l"
                                                            >
                                                                {attemptCode} - {gradeCode}
                                                                <div className="text-xs font-normal text-muted-foreground">
                                                                    {label} ({gradeLabel})
                                                                </div>
                                                            </th>
                                                        );
                                                    });
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tasks.map((task) => {
                                                const { id: taskId, title: taskTitle, maxMarks, attempts: taskAttempts } = task;

                                                return (
                                                    <tr key={taskId} className="border-b hover:bg-muted/50">
                                                        <td className="p-3">{taskTitle}</td>
                                                        <td className="text-center p-3 font-medium">
                                                            {maxMarks}
                                                        </td>
                                                        {attempts.map((attempt) => {
                                                            const { id: attemptId, grades } = attempt;
                                                            const taskAttempt = taskAttempts.find(
                                                                (ta) => ta.id === attemptId
                                                            );

                                                            return grades.map((grade) => {
                                                                const { code: gradeCode } = grade;
                                                                const taskGrade = taskAttempt?.grades.find(
                                                                    (tg) => tg.code === gradeCode
                                                                );

                                                                return (
                                                                    <td
                                                                        key={`${taskId}-${attemptId}-${gradeCode}`}
                                                                        className="text-center p-3 border-l"
                                                                    >
                                                                        {taskGrade?.maxMarks !== null &&
                                                                            taskGrade?.maxMarks !== undefined
                                                                            ? taskGrade.maxMarks
                                                                            : "—"}
                                                                    </td>
                                                                );
                                                            });
                                                        })}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}

            {template.motivationFields.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Motivation Award Fields</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {template.motivationFields.map((field) => {
                                const { id, label, isActive } = field;
                                return (
                                    <div
                                        key={id}
                                        className={`p-3 border rounded-lg ${isActive ? "bg-card" : "bg-muted opacity-60"
                                            }`}
                                    >
                                        <p className="font-medium">{label}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {isActive ? "Active" : "Inactive"}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
