"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import InstructorForm from "./InstructorForm";
import { Instructor, InstructorCreate } from "@/app/lib/api/instructorsApi";

interface InstructorDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (instructor: InstructorCreate) => void;
    instructor?: Instructor;
    isLoading?: boolean;
}

export default function InstructorDialog({
    isOpen,
    onOpenChange,
    onSubmit,
    instructor,
    isLoading = false,
}: InstructorDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        {instructor ? "Edit Instructor" : "Add New Instructor"}
                    </DialogTitle>
                </DialogHeader>

                <InstructorForm
                    instructor={instructor}
                    onSubmit={onSubmit}
                    onCancel={() => onOpenChange(false)}
                    isLoading={isLoading}
                />
            </DialogContent>
        </Dialog>
    );
}