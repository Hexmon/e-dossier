"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Platoon, PlatoonFormData } from "@/types/platoon";
import PlatoonForm from "./PlatoonForm";

interface PlatoonDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: PlatoonFormData) => void;
    platoon?: Platoon;
}

export default function PlatoonDialog({
    isOpen,
    onOpenChange,
    onSubmit,
    platoon,
}: PlatoonDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {platoon ? "Edit Platoon" : "Add Platoon"}
                    </DialogTitle>
                </DialogHeader>

                <PlatoonForm
                    platoon={platoon}
                    onSubmit={onSubmit}
                    onCancel={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
}