// components/interview-mgmt/template-detail/TemplateSemesters.tsx
"use client";

import { useState } from "react";
import { useInterviewTemplates } from "@/hooks/useInterviewTemplates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Calendar } from "lucide-react";
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface TemplateSemestersProps {
    templateId: string;
}

export default function TemplateSemesters({ templateId }: TemplateSemestersProps) {
    // -------------------------------------------------------------------------
    // The detail page already passed templateId into useInterviewTemplates,
    // which enabled the semestersQuery. No useEffect needed.
    // -------------------------------------------------------------------------
    const {
        loading,
        semesters,
        addSemesterToTemplate,
        removeSemesterFromTemplate,
    } = useInterviewTemplates({ templateId });

    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [semesterToDelete, setSemesterToDelete] = useState<number | null>(null);
    const [selectedSemesters, setSelectedSemesters] = useState<number[]>([]);

    const availableSemesters = [1, 2, 3, 4, 5, 6];
    const assignedSemesterNumbers = semesters.map((s) => s.semester);
    const unassignedSemesters = availableSemesters.filter(
        (sem) => !assignedSemesterNumbers.includes(sem)
    );

    const handleAddSemesters = async () => {
        if (selectedSemesters.length === 0) return;

        try {
            for (const semester of selectedSemesters) {
                await addSemesterToTemplate(templateId, semester);
            }
            // Mutations already invalidated the semesters query
            setSelectedSemesters([]);
            setAddDialogOpen(false);
        } catch {
            // Toast already shown by mutation onError
        }
    };

    const handleDeleteSemester = (semester: number) => {
        setSemesterToDelete(semester);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (semesterToDelete) {
            try {
                await removeSemesterFromTemplate(templateId, semesterToDelete);
                // Mutation already invalidated the semesters query
            } catch {
                // Toast already shown by mutation onError
            }
        }
        setDeleteDialogOpen(false);
        setSemesterToDelete(null);
    };

    const toggleSemester = (semester: number, checked: boolean) => {
        if (checked) {
            setSelectedSemesters((prev) => [...prev, semester]);
        } else {
            setSelectedSemesters((prev) => prev.filter((s) => s !== semester));
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Assigned Semesters
                        </CardTitle>
                        {unassignedSemesters.length > 0 && (
                            <Button
                                onClick={() => setAddDialogOpen(true)}
                                className="flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add Semesters
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        </div>
                    ) : semesters.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No semesters assigned yet</p>
                            <Button
                                variant="outline"
                                onClick={() => setAddDialogOpen(true)}
                                className="mt-4"
                            >
                                Add Semesters
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {semesters.map((sem) => (
                                <div
                                    key={sem.id}
                                    className="flex items-center justify-between p-4 border rounded-lg"
                                >
                                    <div>
                                        <Badge variant="outline" className="text-base">
                                            Semester {sem.semester}
                                        </Badge>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteSemester(sem.semester)}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add Semesters Dialog */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Semesters</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-3">
                            {unassignedSemesters.map((sem) => (
                                <div key={sem} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`add-sem-${sem}`}
                                        checked={selectedSemesters.includes(sem)}
                                        onCheckedChange={(checked) =>
                                            toggleSemester(sem, checked as boolean)
                                        }
                                    />
                                    <Label htmlFor={`add-sem-${sem}`} className="text-base">
                                        Semester {sem}
                                    </Label>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setAddDialogOpen(false);
                                    setSelectedSemesters([]);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAddSemesters}
                                disabled={selectedSemesters.length === 0 || loading}
                            >
                                Add Selected
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Semester</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove Semester {semesterToDelete} from this
                            template?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSemesterToDelete(null)}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive">
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
