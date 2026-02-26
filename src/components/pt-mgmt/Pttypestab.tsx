"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import PTTypesTable from "@/components/pt-mgmt/PTTypesTable";
import PTTypeForm from "@/components/pt-mgmt/Pttypeform";
import PTTypeAttemptsDrawer from "@/components/pt-mgmt/PTTypeAttemptsDrawer";
import PTTypeTasksDrawer from "@/components/pt-mgmt/PTTypeTasksDrawer";
import { PTAttemptCreate, PTTaskCreate, PTType, PTTypeCreate } from "@/app/lib/api/Physicaltrainingapi";

interface PTTypesTabProps {
    semester: number;
    types: PTType[];
    loading: boolean;
    onAdd: (type: PTTypeCreate) => Promise<boolean>;
    onEdit: (id: string, type: PTTypeCreate) => Promise<boolean>;
    onDelete: (id: string) => Promise<boolean>;
    onAddAttempt: (typeId: string, attempt: PTAttemptCreate) => Promise<boolean>;
    onEditAttempt: (typeId: string, attemptId: string, attempt: PTAttemptCreate) => Promise<boolean>;
    onDeleteAttempt: (typeId: string, attemptId: string) => Promise<boolean>;
    onOpenGradesForAttempt: (typeId: string, attemptId: string) => void;
    onAddTask: (typeId: string, task: PTTaskCreate) => Promise<boolean>;
    onEditTask: (typeId: string, taskId: string, task: PTTaskCreate) => Promise<boolean>;
    onDeleteTask: (typeId: string, taskId: string) => Promise<boolean>;
    onOpenTasksForType: (typeId: string) => void;
    onOpenScoresForTask: (typeId: string, taskId: string) => void;
}

export default function PTTypesTab({
    semester,
    types,
    loading,
    onAdd,
    onEdit,
    onDelete,
    onAddAttempt,
    onEditAttempt,
    onDeleteAttempt,
    onOpenGradesForAttempt,
    onAddTask,
    onEditTask,
    onDeleteTask,
    onOpenTasksForType,
    onOpenScoresForTask,
}: PTTypesTabProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingType, setEditingType] = useState<PTType | undefined>(undefined);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [isAttemptsDrawerOpen, setIsAttemptsDrawerOpen] = useState(false);
    const [attemptsDrawerType, setAttemptsDrawerType] = useState<PTType | null>(null);
    const [isTasksDrawerOpen, setIsTasksDrawerOpen] = useState(false);
    const [tasksDrawerType, setTasksDrawerType] = useState<PTType | null>(null);
    const nextSortOrder = useMemo(
        () => Math.max(0, ...types.map((item) => item.sortOrder ?? 0)) + 1,
        [types],
    );

    const handleSubmit = async (data: PTTypeCreate) => {
        const targetSortOrder = data.sortOrder ?? nextSortOrder;
        const duplicate = types.find(
            (item) =>
                item.semester === data.semester &&
                item.sortOrder === targetSortOrder &&
                item.id !== editingType?.id,
        );

        if (duplicate) {
            toast.error(`Sort order ${targetSortOrder} is already used in semester ${data.semester}.`);
            return;
        }

        const result = editingType
            ? await onEdit(editingType.id, data)
            : await onAdd(data);

        if (!result) return;
        setIsDialogOpen(false);
        setEditingType(undefined);
    };

    const handleEdit = (index: number) => {
        const type = types[index];
        if (type) {
            setEditingType(type);
            setIsDialogOpen(true);
        }
    };

    const handleDeleteClick = (id: string) => {
        setItemToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (itemToDelete) {
            await onDelete(itemToDelete);
        }
        setDeleteConfirmOpen(false);
        setItemToDelete(null);
    };

    const handleManageAttempts = (type: PTType) => {
        setAttemptsDrawerType(type);
        setIsAttemptsDrawerOpen(true);
    };

    const handleManageTasks = (type: PTType) => {
        setTasksDrawerType(type);
        setIsTasksDrawerOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">
                    PT Types - Semester {semester}
                </h2>
                <Button
                    variant="outline"
                    onClick={() => {
                        setEditingType(undefined);
                        setIsDialogOpen(true);
                    }}
                    className="flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add PT Type
                </Button>
            </div>

            <p className="text-sm text-muted-foreground">
                Use Attempts and Tasks actions here, then jump directly to Grades or Score Matrix.
            </p>

            <PTTypesTable
                types={types}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onManageAttempts={handleManageAttempts}
                onManageTasks={handleManageTasks}
                loading={loading}
            />

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5" />
                            {editingType ? "Edit PT Type" : "Add New PT Type"}
                        </DialogTitle>
                    </DialogHeader>
                    <PTTypeForm
                        type={editingType}
                        defaultSemester={semester}
                        suggestedSortOrder={nextSortOrder}
                        onSubmit={handleSubmit}
                        onCancel={() => {
                            setIsDialogOpen(false);
                            setEditingType(undefined);
                        }}
                        isLoading={loading}
                    />
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the PT type
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

            <PTTypeAttemptsDrawer
                open={isAttemptsDrawerOpen}
                onOpenChange={setIsAttemptsDrawerOpen}
                type={attemptsDrawerType}
                onAdd={onAddAttempt}
                onEdit={onEditAttempt}
                onDelete={onDeleteAttempt}
                onOpenGradesForAttempt={onOpenGradesForAttempt}
            />

            <PTTypeTasksDrawer
                open={isTasksDrawerOpen}
                onOpenChange={setIsTasksDrawerOpen}
                type={tasksDrawerType}
                onAdd={onAddTask}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onOpenTasksForType={onOpenTasksForType}
                onOpenScoresForTask={onOpenScoresForTask}
            />
        </div>
    );
}
