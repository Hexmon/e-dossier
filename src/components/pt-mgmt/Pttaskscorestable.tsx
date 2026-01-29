"use client";

import { PTTaskScore, PTAttempt, PTGrade } from "@/app/lib/api/Physicaltrainingapi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Trash2, Loader2 } from "lucide-react";

interface PTTaskScoresTableProps {
    scores: PTTaskScore[];
    attempts: PTAttempt[];
    grades: PTGrade[];
    onEdit: (index: number) => void;
    onDelete: (id: string) => void;
    loading: boolean;
}

export default function PTTaskScoresTable({
    scores,
    attempts,
    grades,
    onEdit,
    onDelete,
    loading,
}: PTTaskScoresTableProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (scores.length === 0) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="text-center">
                        <p className="text-muted-foreground">No score matrix entries found</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Click "Add Score Entry" to create one
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Helper function to find attempt and grade details
    const getAttemptLabel = (attemptId: string) => {
        const attempt = attempts.find((a) => a.id === attemptId);
        return attempt ? `${attempt.code} - ${attempt.label}` : attemptId;
    };

    const getGradeLabel = (gradeId: string) => {
        const grade = grades.find((g) => g.id === gradeId);
        return grade ? `${grade.code} - ${grade.label}` : gradeId;
    };

    const isCompensatory = (attemptId: string) => {
        const attempt = attempts.find((a) => a.id === attemptId);
        return attempt?.isCompensatory || false;
    };

    const handleEditClick = (index: number, score: PTTaskScore) => {
        console.log("Edit button clicked:", {
            index,
            scoreId: score.id,
            score,
            totalScores: scores.length
        });
        onEdit(index);
    };

    return (
        <Card>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className="text-left p-4 font-semibold">Attempt</th>
                                <th className="text-left p-4 font-semibold">Grade</th>
                                <th className="text-center p-4 font-semibold">Max Marks</th>
                                <th className="text-center p-4 font-semibold">Type</th>
                                <th className="text-center p-4 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scores.map((score, index) => (
                                <tr key={score.id} className="border-b hover:bg-muted/50">
                                    <td className="p-4 font-medium">
                                        {getAttemptLabel(score.ptAttemptId)}
                                    </td>
                                    <td className="p-4">{getGradeLabel(score.ptAttemptGradeId)}</td>
                                    <td className="text-center p-4 font-semibold">
                                        {score.maxMarks}
                                    </td>
                                    <td className="text-center p-4">
                                        {isCompensatory(score.ptAttemptId) ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                Compensatory
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                Regular
                                            </span>
                                        )}
                                    </td>
                                    <td className="text-center p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEditClick(index, score)}
                                                className="h-8 w-8 p-0"
                                                title="Edit score entry"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    console.log("Delete clicked for score ID:", score.id);
                                                    onDelete(score.id);
                                                }}
                                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                title="Delete score entry"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}