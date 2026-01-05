"use client";

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
import { TrainingCamp } from "@/app/lib/api/trainingCampsApi";

interface DeleteCampDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    camp: TrainingCamp | null;
    isLoading?: boolean;
}

export default function DeleteCampDialog({
    isOpen,
    onOpenChange,
    onConfirm,
    camp,
    isLoading = false,
}: DeleteCampDialogProps) {
    if (!camp) return null;

    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Camp</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete the camp <strong>{camp.name}</strong>?
                        <br />
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            onConfirm();
                        }}
                        disabled={isLoading}
                        className="bg-red-500 text-white hover:bg-red-700"
                    >
                        {isLoading ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

