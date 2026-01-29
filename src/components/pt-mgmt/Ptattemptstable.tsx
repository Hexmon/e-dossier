"use client";

import { PTAttempt } from "@/app/lib/api/Physicaltrainingapi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Trash2, Loader2, Award } from "lucide-react";

interface PTAttemptsTableProps {
    attempts: PTAttempt[];
    onEdit: (index: number) => void;
    onDelete: (id: string) => void;
    onManageGrades: (index: number) => void;
    loading: boolean;
}

export default function PTAttemptsTable({
    attempts,
    onEdit,
    onDelete,
    onManageGrades,
    loading,
}: PTAttemptsTableProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (attempts.length === 0) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="text-center">
                        <p className="text-muted-foreground">No attempts found</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Click "Add Attempt" to create one
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className="text-left p-4 font-semibold">Code</th>
                                <th className="text-left p-4 font-semibold">Label</th>
                                <th className="text-center p-4 font-semibold">Compensatory</th>
                                <th className="text-center p-4 font-semibold">Sort Order</th>
                                <th className="text-center p-4 font-semibold">Status</th>
                                <th className="text-center p-4 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attempts.map((attempt, index) => (
                                <tr key={attempt.id} className="border-b hover:bg-muted/50">
                                    <td className="p-4 font-medium">{attempt.code}</td>
                                    <td className="p-4">{attempt.label}</td>
                                    <td className="text-center p-4">
                                        {attempt.isCompensatory ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                Yes
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                No
                                            </span>
                                        )}
                                    </td>
                                    <td className="text-center p-4">{attempt.sortOrder}</td>
                                    <td className="text-center p-4">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${attempt.isActive
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-gray-100 text-gray-800"
                                                }`}
                                        >
                                            {attempt.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="text-center p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onManageGrades(index)}
                                                className="h-8 px-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                                title="Manage Grades"
                                            >
                                                <Award className="h-4 w-4 mr-1" />
                                                Grades
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onEdit(index)}
                                                className="h-8 w-8 p-0"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onDelete(attempt.id)}
                                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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