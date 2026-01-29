"use client";

import { PTTemplate } from "@/app/lib/api/Physicaltrainingapi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface PTTemplateViewProps {
    template: PTTemplate | null;
    loading: boolean;
    semester: number;
}

export default function PTTemplateView({ template, loading, semester }: PTTemplateViewProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!template || template.types.length === 0) {
        return (
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
        );
    }

    return (
        <div className="space-y-6">
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