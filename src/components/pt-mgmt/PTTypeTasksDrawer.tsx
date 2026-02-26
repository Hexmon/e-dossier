"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import {
    PTTask,
    PTTaskCreate,
    PTType,
    listPTTasks,
} from "@/app/lib/api/Physicaltrainingapi";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PTTaskForm from "@/components/pt-mgmt/Pttaskform";
import PTTasksTable from "@/components/pt-mgmt/Pttaskstable";

interface PTTypeTasksDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    type: PTType | null;
    onAdd: (typeId: string, task: PTTaskCreate) => Promise<boolean>;
    onEdit: (typeId: string, taskId: string, task: PTTaskCreate) => Promise<boolean>;
    onDelete: (typeId: string, taskId: string) => Promise<boolean>;
    onOpenTasksForType: (typeId: string) => void;
    onOpenScoresForTask: (typeId: string, taskId: string) => void;
}

export default function PTTypeTasksDrawer({
    open,
    onOpenChange,
    type,
    onAdd,
    onEdit,
    onDelete,
    onOpenTasksForType,
    onOpenScoresForTask,
}: PTTypeTasksDrawerProps) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<PTTask | undefined>(undefined);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    const tasksQuery = useQuery({
        queryKey: ["pt", "tasks", type?.id],
        queryFn: async () => {
            if (!type?.id) return [];
            const data = await listPTTasks(type.id);
            return data?.items ?? [];
        },
        enabled: open && !!type?.id,
        staleTime: 5 * 60 * 1000,
    });

    const tasks = tasksQuery.data ?? [];
    const nextSortOrder = useMemo(
        () => Math.max(0, ...tasks.map((item) => item.sortOrder ?? 0)) + 1,
        [tasks],
    );

    useEffect(() => {
        if (!open) {
            setIsFormOpen(false);
            setEditingTask(undefined);
            setDeleteConfirmOpen(false);
            setItemToDelete(null);
        }
    }, [open]);

    const handleSubmit = async (data: PTTaskCreate) => {
        if (!type?.id) return;
        const targetSortOrder = data.sortOrder ?? nextSortOrder;
        const duplicate = tasks.find(
            (item) => item.sortOrder === targetSortOrder && item.id !== editingTask?.id,
        );
        if (duplicate) {
            toast.error(`Sort order ${targetSortOrder} is already used for this PT type.`);
            return;
        }

        const result = editingTask
            ? await onEdit(type.id, editingTask.id, data)
            : await onAdd(type.id, data);

        if (!result) return;
        setIsFormOpen(false);
        setEditingTask(undefined);
        await tasksQuery.refetch();
    };

    const handleEdit = (index: number) => {
        const task = tasks[index];
        if (!task) return;
        setEditingTask(task);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        setItemToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete || !type?.id) return;
        const result = await onDelete(type.id, itemToDelete);
        if (!result) return;
        setDeleteConfirmOpen(false);
        setItemToDelete(null);
        await tasksQuery.refetch();
    };

    const handleManageScores = (task: PTTask) => {
        if (!type?.id) return;
        onOpenScoresForTask(type.id, task.id);
        onOpenChange(false);
    };

    const handleOpenTasksTab = () => {
        if (!type?.id) return;
        onOpenTasksForType(type.id);
        onOpenChange(false);
    };

    const showInitialLoader = tasksQuery.isLoading && tasks.length === 0;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-[95vw] lg:max-w-[62vw] p-0 gap-0 overflow-y-auto"
            >
                <SheetHeader className="border-b">
                    <SheetTitle>
                        Manage Tasks {type ? `- ${type.code}` : ""}
                    </SheetTitle>
                    <SheetDescription>
                        {type?.title ?? "Select a PT type to manage its tasks."}
                    </SheetDescription>
                </SheetHeader>

                <div className="p-6 space-y-6">
                    {type && (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setEditingTask(undefined);
                                        setIsFormOpen(true);
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Task
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleOpenTasksTab}
                                    className="flex items-center gap-2"
                                >
                                    Open Tasks Tab
                                </Button>
                            </div>
                            <Button
                                variant="ghost"
                                onClick={() => void tasksQuery.refetch()}
                                disabled={tasksQuery.isFetching}
                                className="flex items-center gap-2"
                            >
                                <RefreshCw className={`h-4 w-4 ${tasksQuery.isFetching ? "animate-spin" : ""}`} />
                                Refresh
                            </Button>
                        </div>
                    )}

                    {isFormOpen && (
                        <div className="rounded-lg border p-4">
                            <h3 className="font-semibold mb-4">
                                {editingTask ? "Edit Task" : "Add New Task"}
                            </h3>
                            <PTTaskForm
                                task={editingTask}
                                suggestedSortOrder={nextSortOrder}
                                onSubmit={handleSubmit}
                                onCancel={() => {
                                    setIsFormOpen(false);
                                    setEditingTask(undefined);
                                }}
                                isLoading={tasksQuery.isFetching}
                            />
                        </div>
                    )}

                    {showInitialLoader ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : tasksQuery.isError ? (
                        <div className="rounded-lg border p-6 text-center space-y-3">
                            <p className="text-sm text-muted-foreground">
                                Failed to load tasks for this PT type.
                            </p>
                            <Button variant="outline" onClick={() => void tasksQuery.refetch()}>
                                Retry
                            </Button>
                        </div>
                    ) : (
                        <PTTasksTable
                            tasks={tasks}
                            onEdit={handleEdit}
                            onDelete={handleDeleteClick}
                            onManageScores={handleManageScores}
                            loading={tasksQuery.isFetching && tasks.length === 0}
                        />
                    )}
                </div>

                <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the task
                                from the system.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setItemToDelete(null)}>
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete} className="bg-destructive">
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </SheetContent>
        </Sheet>
    );
}
