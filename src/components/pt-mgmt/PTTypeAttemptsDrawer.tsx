"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import {
    PTAttempt,
    PTAttemptCreate,
    PTType,
    listPTAttempts,
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
import PTAttemptForm from "@/components/pt-mgmt/Ptattemptform";
import PTAttemptsTable from "@/components/pt-mgmt/Ptattemptstable";

interface PTTypeAttemptsDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    type: PTType | null;
    onAdd: (typeId: string, attempt: PTAttemptCreate) => Promise<boolean>;
    onEdit: (typeId: string, attemptId: string, attempt: PTAttemptCreate) => Promise<boolean>;
    onDelete: (typeId: string, attemptId: string) => Promise<boolean>;
    onOpenGradesForAttempt: (typeId: string, attemptId: string) => void;
}

export default function PTTypeAttemptsDrawer({
    open,
    onOpenChange,
    type,
    onAdd,
    onEdit,
    onDelete,
    onOpenGradesForAttempt,
}: PTTypeAttemptsDrawerProps) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAttempt, setEditingAttempt] = useState<PTAttempt | undefined>(undefined);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    const attemptsQuery = useQuery({
        queryKey: ["pt", "attempts", type?.id],
        queryFn: async () => {
            if (!type?.id) return [];
            const data = await listPTAttempts(type.id);
            return data?.items ?? [];
        },
        enabled: open && !!type?.id,
        staleTime: 5 * 60 * 1000,
    });

    const attempts = attemptsQuery.data ?? [];
    const nextSortOrder = useMemo(
        () => Math.max(0, ...attempts.map((item) => item.sortOrder ?? 0)) + 1,
        [attempts],
    );

    useEffect(() => {
        if (!open) {
            setIsFormOpen(false);
            setEditingAttempt(undefined);
            setDeleteConfirmOpen(false);
            setItemToDelete(null);
        }
    }, [open]);

    const handleSubmit = async (data: PTAttemptCreate) => {
        if (!type?.id) return;

        const targetSortOrder = data.sortOrder ?? nextSortOrder;
        const duplicate = attempts.find(
            (item) => item.sortOrder === targetSortOrder && item.id !== editingAttempt?.id,
        );
        if (duplicate) {
            toast.error(`Sort order ${targetSortOrder} is already used for this PT type.`);
            return;
        }

        const result = editingAttempt
            ? await onEdit(type.id, editingAttempt.id, data)
            : await onAdd(type.id, data);

        if (!result) return;
        setIsFormOpen(false);
        setEditingAttempt(undefined);
        await attemptsQuery.refetch();
    };

    const handleEdit = (index: number) => {
        const attempt = attempts[index];
        if (!attempt) return;
        setEditingAttempt(attempt);
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
        await attemptsQuery.refetch();
    };

    const handleManageGrades = (index: number) => {
        const attempt = attempts[index];
        if (!attempt || !type?.id) return;
        onOpenGradesForAttempt(type.id, attempt.id);
        onOpenChange(false);
    };

    const showInitialLoader = attemptsQuery.isLoading && attempts.length === 0;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-[95vw] lg:max-w-[62vw] p-0 gap-0 overflow-y-auto"
            >
                <SheetHeader className="border-b">
                    <SheetTitle>
                        Manage Attempts {type ? `- ${type.code}` : ""}
                    </SheetTitle>
                    <SheetDescription>
                        {type?.title ?? "Select a PT type to manage its attempts."}
                    </SheetDescription>
                </SheetHeader>

                <div className="p-6 space-y-6">
                    {type && (
                        <div className="flex items-center justify-between gap-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setEditingAttempt(undefined);
                                    setIsFormOpen(true);
                                }}
                                className="flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add Attempt
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => void attemptsQuery.refetch()}
                                disabled={attemptsQuery.isFetching}
                                className="flex items-center gap-2"
                            >
                                <RefreshCw className={`h-4 w-4 ${attemptsQuery.isFetching ? "animate-spin" : ""}`} />
                                Refresh
                            </Button>
                        </div>
                    )}

                    {isFormOpen && (
                        <div className="rounded-lg border p-4">
                            <h3 className="font-semibold mb-4">
                                {editingAttempt ? "Edit Attempt" : "Add New Attempt"}
                            </h3>
                            <PTAttemptForm
                                attempt={editingAttempt}
                                suggestedSortOrder={nextSortOrder}
                                onSubmit={handleSubmit}
                                onCancel={() => {
                                    setIsFormOpen(false);
                                    setEditingAttempt(undefined);
                                }}
                                isLoading={attemptsQuery.isFetching}
                            />
                        </div>
                    )}

                    {showInitialLoader ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : attemptsQuery.isError ? (
                        <div className="rounded-lg border p-6 text-center space-y-3">
                            <p className="text-sm text-muted-foreground">
                                Failed to load attempts for this PT type.
                            </p>
                            <Button variant="outline" onClick={() => void attemptsQuery.refetch()}>
                                Retry
                            </Button>
                        </div>
                    ) : (
                        <PTAttemptsTable
                            attempts={attempts}
                            onEdit={handleEdit}
                            onDelete={handleDeleteClick}
                            onManageGrades={handleManageGrades}
                            loading={attemptsQuery.isFetching && attempts.length === 0}
                        />
                    )}
                </div>

                <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the attempt
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
