"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import OfferingForm from "./OfferingForm";
import { Offering, OfferingCreate } from "@/app/lib/api/offeringsApi";

interface OfferingDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (offering: OfferingCreate) => void;
    offering?: Offering;
    isLoading?: boolean;
    subjects?: Array<{ id: string; code: string; name: string }>;
    instructors?: Array<{ id: string; name: string; email: string }>;
}

export default function OfferingDialog({
    isOpen,
    onOpenChange,
    onSubmit,
    offering,
    isLoading = false,
    subjects = [],
    instructors = [],
}: OfferingDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        {offering ? "Edit Offering" : "Add New Offering"}
                    </DialogTitle>
                </DialogHeader>

                <OfferingForm
                    offering={offering}
                    onSubmit={onSubmit}
                    onCancel={() => onOpenChange(false)}
                    isLoading={isLoading}
                    subjects={subjects}
                    instructors={instructors}
                />
            </DialogContent>
        </Dialog>
    );
}