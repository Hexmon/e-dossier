"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Edit3 } from "lucide-react";
import CampForm, { CampFormData } from "./CampForm";

interface CampDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: CampFormData) => void;
    isLoading?: boolean;
    initialData?: CampFormData;
    mode?: "create" | "edit";
}

export default function CampDialog({
    isOpen,
    onOpenChange,
    onSubmit,
    isLoading = false,
    initialData,
    mode = "create",
}: CampDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {mode === "edit" ? (
                            <>
                                <Edit3 className="h-5 w-5" />
                                Edit Camp
                            </>
                        ) : (
                            <>
                                <Plus className="h-5 w-5" />
                                Create New Camp
                            </>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <CampForm
                    onSubmit={onSubmit}
                    onCancel={() => onOpenChange(false)}
                    isLoading={isLoading}
                    initialData={initialData}
                    mode={mode}
                />
            </DialogContent>
        </Dialog>
    );
}

