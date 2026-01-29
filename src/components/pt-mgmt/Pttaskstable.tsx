"use client";

import { PTTask } from "@/app/lib/api/Physicaltrainingapi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Trash2, Loader2, Grid } from "lucide-react";

interface PTTasksTableProps {
    tasks: PTTask[];
    onEdit: (index: number) => void;
    onDelete: (id: string) => void;
    onManageScores: (index: number) => void;
    loading: boolean;
}

export default function PTTasksTable({
    tasks,
    onEdit,
    onDelete,
    onManageScores,
    loading,
}: PTTasksTableProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (tasks.length === 0) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="text-center">
                        <p className="text-muted-foreground">No tasks found</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Click "Add Task" to create one
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
                                <th className="text-left p-4 font-semibold">Title</th>
                                <th className="text-center p-4 font-semibold">Max Marks</th>
                                <th className="text-center p-4 font-semibold">Sort Order</th>
                                <th className="text-center p-4 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map((task, index) => (
                                <tr key={task.id} className="border-b hover:bg-muted/50">
                                    <td className="p-4 font-medium">{task.title}</td>
                                    <td className="text-center p-4">{task.maxMarks}</td>
                                    <td className="text-center p-4">{task.sortOrder}</td>
                                    <td className="text-center p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onManageScores(index)}
                                                className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                title="Manage Score Matrix"
                                            >
                                                <Grid className="h-4 w-4 mr-1" />
                                                Scores
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
                                                onClick={() => onDelete(task.id)}
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