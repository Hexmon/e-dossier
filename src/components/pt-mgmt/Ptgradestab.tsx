"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import PTGradeForm from "@/components/pt-mgmt/Ptgradeform";
import { PTAttempt, PTGrade, PTGradeCreate, PTType } from "@/app/lib/api/Physicaltrainingapi";
import PTGradesTable from "./Ptgradestable";

interface PTGradesTabProps {
    types: PTType[];
    selectedTypeId: string | null;
    selectedAttemptId: string | null;
    attempts: PTAttempt[];
    grades: PTGrade[];
    loading: boolean;
    onTypeSelect: (typeId: string | null) => void;
    onAttemptSelect: (attemptId: string | null) => void;
    onAdd: (typeId: string, attemptId: string, grade: PTGradeCreate) => Promise<boolean>;
    onEdit: (typeId: string, attemptId: string, gradeId: string, grade: PTGradeCreate) => Promise<boolean>;
    onDelete: (typeId: string, attemptId: string, gradeId: string) => Promise<boolean>;
}

export default function PTGradesTab({
    types,
    selectedTypeId,
    selectedAttemptId,
    attempts,
    grades,
    loading,
    onTypeSelect,
    onAttemptSelect,
    onAdd,
    onEdit,
    onDelete,
}: PTGradesTabProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingGrade, setEditingGrade] = useState<PTGrade | undefined>(undefined);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    const selectedType = types.find((t) => t.id === selectedTypeId);
    const selectedAttempt = attempts.find((a) => a.id === selectedAttemptId);

    const handleSubmit = async (data: PTGradeCreate) => {
        if (!selectedTypeId || !selectedAttemptId) return;

        const result = editingGrade
            ? await onEdit(selectedTypeId, selectedAttemptId, editingGrade.id, data)
            : await onAdd(selectedTypeId, selectedAttemptId, data);

        setIsDialogOpen(false);
        setEditingGrade(undefined);
    };

    const handleEdit = (index: number) => {
        const grade = grades[index];
        if (grade) {
            setEditingGrade(grade);
            setIsDialogOpen(true);
        }
    };

    const handleDeleteClick = (id: string) => {
        setItemToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (itemToDelete && selectedTypeId && selectedAttemptId) {
            await onDelete(selectedTypeId, selectedAttemptId, itemToDelete);
        }
        setDeleteConfirmOpen(false);
        setItemToDelete(null);
    };

    return (
        <div className="space-y-6">
            {/* Type and Attempt Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Select PT Type:</label>
                    <Select
                        value={selectedTypeId || ""}
                        onValueChange={(value) => {
                            onTypeSelect(value || null);
                            onAttemptSelect(null); // Reset attempt when type changes
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select a PT type" />
                        </SelectTrigger>
                        <SelectContent>
                            {types.map((type) => (
                                <SelectItem key={type.id} value={type.id}>
                                    {type.code} - {type.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Select Attempt:</label>
                    <Select
                        value={selectedAttemptId || ""}
                        onValueChange={(value) => onAttemptSelect(value || null)}
                        disabled={!selectedTypeId || attempts.length === 0}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select an attempt" />
                        </SelectTrigger>
                        <SelectContent>
                            {attempts.map((attempt) => (
                                <SelectItem key={attempt.id} value={attempt.id}>
                                    {attempt.code} - {attempt.label}
                                    {attempt.isCompensatory && " (Compensatory)"}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selectedTypeId && attempts.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                            No attempts available. Please create attempts first in the Attempts tab.
                        </p>
                    )}
                </div>
            </div>

            {/* Content Area */}
            {!selectedTypeId ? (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <p className="text-muted-foreground">
                                Please select a PT type to manage grades
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : !selectedAttemptId ? (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <p className="text-muted-foreground">
                                Please select an attempt to manage its grades
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-foreground">
                            Grades for {selectedType?.code} - {selectedAttempt?.code} ({selectedAttempt?.label})
                        </h2>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setEditingGrade(undefined);
                                setIsDialogOpen(true);
                            }}
                            className="flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Add Grade
                        </Button>
                    </div>

                    <PTGradesTable
                        grades={grades}
                        onEdit={handleEdit}
                        onDelete={handleDeleteClick}
                        loading={loading}
                    />
                </>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5" />
                            {editingGrade ? "Edit Grade" : "Add New Grade"}
                        </DialogTitle>
                    </DialogHeader>
                    <PTGradeForm
                        grade={editingGrade}
                        onSubmit={handleSubmit}
                        onCancel={() => {
                            setIsDialogOpen(false);
                            setEditingGrade(undefined);
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
                            This action cannot be undone. This will permanently delete the grade
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
        </div>
    );
}