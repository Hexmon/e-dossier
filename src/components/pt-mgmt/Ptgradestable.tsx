"use client";

import { PTGrade } from "@/app/lib/api/Physicaltrainingapi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Trash2, Loader2 } from "lucide-react";

interface PTGradesTableProps {
    grades: PTGrade[];
    onEdit: (index: number) => void;
    onDelete: (id: string) => void;
    loading: boolean;
}

export default function PTGradesTable({
    grades,
    onEdit,
    onDelete,
    loading,
}: PTGradesTableProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (grades.length === 0) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="text-center">
                        <p className="text-muted-foreground">No grades found</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Click "Add Grade" to create one
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
                                <th className="text-center p-4 font-semibold">Sort Order</th>
                                <th className="text-center p-4 font-semibold">Status</th>
                                <th className="text-center p-4 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {grades.map((grade, index) => (
                                <tr key={grade.id} className="border-b hover:bg-muted/50">
                                    <td className="p-4 font-medium">{grade.code}</td>
                                    <td className="p-4">{grade.label}</td>
                                    <td className="text-center p-4">{grade.sortOrder}</td>
                                    <td className="text-center p-4">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${grade.isActive
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-gray-100 text-gray-800"
                                                }`}
                                        >
                                            {grade.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="text-center p-4">
                                        <div className="flex items-center justify-center gap-2">
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
                                                onClick={() => onDelete(grade.id)}
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