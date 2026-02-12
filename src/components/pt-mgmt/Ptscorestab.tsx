"use client";

import { useState } from "react";
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
import {
    PTTask,
    PTTaskScore,
    PTTaskScoreCreate,
    PTAttempt,
    PTGrade,
    PTType,
} from "@/app/lib/api/Physicaltrainingapi";
import PTTaskScoresTable from "./Pttaskscorestable";
import PTTaskScoreForm from "./Pttaskscoreform";

interface PTScoresTabProps {
    types: PTType[];
    selectedTypeId: string | null;
    selectedTaskId: string | null;
    tasks: PTTask[];
    taskScores: PTTaskScore[];
    attempts: PTAttempt[];
    grades: PTGrade[];
    loading: boolean;
    onTypeSelect: (typeId: string | null) => void;
    onTaskSelect: (taskId: string | null) => void;
    onAdd: (typeId: string, taskId: string, score: PTTaskScoreCreate) => Promise<boolean>;
    onEdit: (typeId: string, taskId: string, scoreId: string, score: PTTaskScoreCreate) => Promise<boolean>;
    onDelete: (typeId: string, taskId: string, scoreId: string) => Promise<boolean>;
}

export default function PTScoresTab({
    types,
    selectedTypeId,
    selectedTaskId,
    tasks,
    taskScores,
    attempts,
    grades,
    loading,
    onTypeSelect,
    onTaskSelect,
    onAdd,
    onEdit,
    onDelete,
}: PTScoresTabProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingScore, setEditingScore] = useState<PTTaskScore | undefined>(undefined);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    const selectedType = types.find((t) => t.id === selectedTypeId);
    const selectedTask = tasks.find((t) => t.id === selectedTaskId);

    const handleSubmit = async (data: PTTaskScoreCreate) => {
        if (!selectedTypeId || !selectedTaskId) {
            console.error("Missing selectedTypeId or selectedTaskId");
            return;
        }

        try {
            const result = editingScore
                ? await onEdit(selectedTypeId, selectedTaskId, editingScore.id, data)
                : await onAdd(selectedTypeId, selectedTaskId, data);


            setIsDialogOpen(false);
            setEditingScore(undefined);

        } catch (error) {
        }
    };

    const handleEdit = (index: number) => {
        console.log("handleEdit called with index:", index);
        console.log("Total scores:", taskScores.length);

        const score = taskScores[index];
        console.log("Score at index:", score);

        if (score) {
            console.log("Setting editingScore and opening dialog:", score);
            setEditingScore(score);
            setIsDialogOpen(true);
        } else {
            console.error("No score found at index:", index);
        }
    };

    const handleDeleteClick = (id: string) => {
        console.log("Delete clicked for score ID:", id);
        setItemToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (itemToDelete && selectedTypeId && selectedTaskId) {
            console.log("Confirming delete for:", itemToDelete);
            await onDelete(selectedTypeId, selectedTaskId, itemToDelete);
        }
        setDeleteConfirmOpen(false);
        setItemToDelete(null);
    };

    const handleDialogOpenChange = (open: boolean) => {
        console.log("Dialog open state changing to:", open);
        setIsDialogOpen(open);
        if (!open) {
            console.log("Dialog closing, clearing editingScore");
            setEditingScore(undefined);
        }
    };

    const handleCancel = () => {
        console.log("Cancel clicked");
        setIsDialogOpen(false);
        setEditingScore(undefined);
    };

    return (
        <div className="space-y-6">
            {/* Type and Task Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Select PT Type:</label>
                    <Select
                        value={selectedTypeId || ""}
                        onValueChange={(value) => {
                            onTypeSelect(value || null);
                            onTaskSelect(null); // Reset task when type changes
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
                    <label className="text-sm font-medium">Select Task:</label>
                    <Select
                        value={selectedTaskId || ""}
                        onValueChange={(value) => onTaskSelect(value || null)}
                        disabled={!selectedTypeId || tasks.length === 0}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select a task" />
                        </SelectTrigger>
                        <SelectContent>
                            {tasks.map((task) => (
                                <SelectItem key={task.id} value={task.id}>
                                    {task.title} ({task.maxMarks} marks)
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selectedTypeId && tasks.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                            No tasks available. Please create tasks first in the Tasks tab.
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
                                Please select a PT type to manage score matrix
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : !selectedTaskId ? (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <p className="text-muted-foreground">
                                Please select a task to manage its score matrix
                            </p>
                            {tasks.length === 0 && selectedTypeId && (
                                <p className="text-sm text-muted-foreground mt-2">
                                    No tasks found. Create tasks in the Tasks tab first.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ) : attempts.length === 0 ? (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <p className="text-muted-foreground">
                                No attempts found for {selectedType?.code}
                            </p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Create attempts in the Attempts tab before setting up score matrix.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : grades.length === 0 ? (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <p className="text-muted-foreground">
                                No grades found for the attempts
                            </p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Create grades in the Grades tab before setting up score matrix.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">
                                Score Matrix for {selectedTask?.title}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {selectedType?.code} - Max Marks: {selectedTask?.maxMarks}
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => {
                                console.log("Add Score Entry clicked");
                                setEditingScore(undefined);
                                setIsDialogOpen(true);
                            }}
                            className="flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Add Score Entry
                        </Button>
                    </div>

                    <PTTaskScoresTable
                        scores={taskScores}
                        attempts={attempts}
                        grades={grades}
                        onEdit={handleEdit}
                        onDelete={handleDeleteClick}
                        loading={loading}
                    />
                </>
            )}

            <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5" />
                            {editingScore ? "Edit Score Entry" : "Add New Score Entry"}
                        </DialogTitle>
                    </DialogHeader>
                    <PTTaskScoreForm
                        score={editingScore}
                        attempts={attempts}
                        grades={grades}
                        onSubmit={handleSubmit}
                        onCancel={handleCancel}
                        isLoading={loading}
                    />
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the score
                            entry from the system.
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