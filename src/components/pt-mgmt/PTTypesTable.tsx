"use client";

import { PTType } from "@/app/lib/api/Physicaltrainingapi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Trash2, Loader2 } from "lucide-react";

interface PTTypesTableProps {
    types: PTType[];
    onEdit: (index: number) => void;
    onDelete: (id: string) => void;
    loading: boolean;
}

export default function PTTypesTable({ types, onEdit, onDelete, loading }: PTTypesTableProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (types.length === 0) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="text-center">
                        <p className="text-muted-foreground">No PT types found</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Click "Add PT Type" to create one
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
                                <th className="text-left p-4 font-semibold">Title</th>
                                <th className="text-center p-4 font-semibold">Max Marks</th>
                                <th className="text-center p-4 font-semibold">Sort Order</th>
                                <th className="text-center p-4 font-semibold">Status</th>
                                <th className="text-center p-4 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {types.map((type, index) => (
                                <tr key={type.id} className="border-b hover:bg-muted/50">
                                    <td className="p-4 font-medium">{type.code}</td>
                                    <td className="p-4">{type.title}</td>
                                    <td className="text-center p-4">{type.maxTotalMarks}</td>
                                    <td className="text-center p-4">{type.sortOrder}</td>
                                    <td className="text-center p-4">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${type.isActive
                                                    ? "bg-success/15 text-success"
                                                    : "bg-muted/70 text-foreground"
                                                }`}
                                        >
                                            {type.isActive ? "Active" : "Inactive"}
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
                                                onClick={() => onDelete(type.id)}
                                                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
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