"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import ActivityForm, { ActivityFormData } from "./ActivityForm";
import { Plus, Edit3 } from "lucide-react";

interface ActivityDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: ActivityFormData) => void;
    isLoading?: boolean;
    initialData?: ActivityFormData;
    mode?: "create" | "edit";
    campName?: string;
}

export default function ActivityDialog({
    isOpen,
    onOpenChange,
    onSubmit,
    isLoading = false,
    initialData,
    mode = "create",
    campName,
}: ActivityDialogProps) {
    const Icon = mode === "create" ? Plus : Edit3;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        <DialogTitle>
                            {mode === "create" ? "Create New Activity" : "Edit Activity"}
                        </DialogTitle>
                    </div>
                    <DialogDescription>
                        {mode === "create"
                            ? `Add a new activity to ${campName || "this camp"}`
                            : `Update the activity details for ${campName || "this camp"}`}
                    </DialogDescription>
                </DialogHeader>
                <ActivityForm
                    onSubmit={onSubmit}
                    isLoading={isLoading}
                    initialData={initialData}
                    mode={mode}
                />
            </DialogContent>
        </Dialog>
    );
}

