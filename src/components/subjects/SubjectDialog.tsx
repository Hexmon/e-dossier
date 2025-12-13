"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import SubjectForm from "./SubjectForm";
import { Subject, SubjectCreate } from "@/app/lib/api/subjectsApi";

interface SubjectDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (subject: SubjectCreate) => void;
    subject?: Subject;
    isLoading?: boolean;
}

export default function SubjectDialog({
    isOpen,
    onOpenChange,
    onSubmit,
    subject,
    isLoading = false,
}: SubjectDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        {subject ? "Edit Subject" : "Add New Subject"}
                    </DialogTitle>
                </DialogHeader>

                <SubjectForm
                    subject={subject}
                    onSubmit={onSubmit}
                    onCancel={() => onOpenChange(false)}
                    isLoading={isLoading}
                />
            </DialogContent>
        </Dialog>
    );
}