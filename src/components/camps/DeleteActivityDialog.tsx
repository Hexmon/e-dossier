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
import { TrainingCampActivity } from "@/app/lib/api/trainingCampActivitiesApi";

interface DeleteActivityDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    activity: TrainingCampActivity | null;
    isLoading?: boolean;
}

export default function DeleteActivityDialog({
    isOpen,
    onOpenChange,
    onConfirm,
    activity,
    isLoading = false,
}: DeleteActivityDialogProps) {
    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Activity</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete the activity{" "}
                        <span className="font-semibold">{activity?.name}</span>?
                        <br />
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
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

