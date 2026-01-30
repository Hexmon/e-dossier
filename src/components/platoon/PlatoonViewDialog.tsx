"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Platoon } from "@/types/platoon";

interface PlatoonViewDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    platoon?: Platoon;
}

export default function PlatoonViewDialog({
    isOpen,
    onOpenChange,
    platoon,
}: PlatoonViewDialogProps) {
    if (!platoon) return null;

    const { key, name, about, createdAt, updatedAt } = platoon;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Platoon Details</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <p className="font-semibold text-sm text-muted-foreground">
                            Platoon Key
                        </p>
                        <p className="text-lg">{key || "—"}</p>
                    </div>

                    <div>
                        <p className="font-semibold text-sm text-muted-foreground">
                            Platoon Name
                        </p>
                        <p className="text-lg">{name || "—"}</p>
                    </div>

                    <div>
                        <p className="font-semibold text-sm text-muted-foreground">
                            About
                        </p>
                        <p className="text-sm">
                            {about || "No description provided"}
                        </p>
                    </div>

                    <div className="pt-4 border-t">
                        <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                            <div>
                                <p className="font-semibold">Created</p>
                                <p>{createdAt ? formatDate(createdAt) : "—"}</p>
                            </div>
                            <div>
                                <p className="font-semibold">Last Updated</p>
                                <p>{updatedAt ? formatDate(updatedAt) : "—"}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Helper function (add to @/lib/utils if not exists)
function formatDate(dateString: string): string {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return "Invalid date";
    }
}