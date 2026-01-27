"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { FileText } from "lucide-react";
import InterviewTemplateForm from "./Interviewtemplateform";
import { InterviewTemplate, InterviewTemplateCreate } from "@/app/lib/api/Interviewtemplateapi";

interface InterviewTemplateDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (template: InterviewTemplateCreate) => void;
    template?: InterviewTemplate;
    isLoading?: boolean;
}

export default function InterviewTemplateDialog({
    isOpen,
    onOpenChange,
    onSubmit,
    template,
    isLoading = false,
}: InterviewTemplateDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {template ? "Edit Interview Template" : "Create New Interview Template"}
                    </DialogTitle>
                </DialogHeader>

                <InterviewTemplateForm
                    template={template}
                    onSubmit={onSubmit}
                    onCancel={() => onOpenChange(false)}
                    isLoading={isLoading}
                />
            </DialogContent>
        </Dialog>
    );
}