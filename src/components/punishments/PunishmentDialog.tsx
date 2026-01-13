"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import PunishmentForm from "./PunishmentForm";
import { Punishment, PunishmentCreate } from "@/app/lib/api/punishmentsApi";

interface PunishmentDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (punishment: PunishmentCreate) => void;
    punishment?: Punishment;
    isLoading?: boolean;
}

export default function PunishmentDialog({
    isOpen,
    onOpenChange,
    onSubmit,
    punishment,
    isLoading = false,
}: PunishmentDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        {punishment ? "Edit Punishment" : "Add New Punishment"}
                    </DialogTitle>
                </DialogHeader>

                <PunishmentForm
                    punishment={punishment}
                    onSubmit={onSubmit}
                    onCancel={() => onOpenChange(false)}
                    isLoading={isLoading}
                />
            </DialogContent>
        </Dialog>
    );
}