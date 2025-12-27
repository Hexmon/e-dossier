"use client";

import { Button } from "@/components/ui/button";
import { Edit3, Trash2, Plus } from "lucide-react";
import { TrainingCampActivity } from "@/app/lib/api/trainingCampActivitiesApi";

interface ActivitiesListProps {
    activities: TrainingCampActivity[];
    onEdit: (activity: TrainingCampActivity) => void;
    onDelete: (activity: TrainingCampActivity) => void;
    onAdd: () => void;
    loading?: boolean;
}

export default function ActivitiesList({
    activities,
    onEdit,
    onDelete,
    onAdd,
    loading = false,
}: ActivitiesListProps) {
    if (loading) {
        return (
            <div className="text-sm text-muted-foreground">
                Loading activities...
            </div>
        );
    }

    return (
        <div className="space-y-2 bg-card/50 p-3 rounded-lg shadow-md backdrop-blur">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                    Activities ({activities.length})
                </span>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={onAdd}
                    className="h-7 gap-1"
                >
                    <Plus className="h-3 w-3" />
                    Add
                </Button>
            </div>

            {activities.length === 0 ? (
                <div className="text-sm text-muted-foreground py-2">
                    No activities yet. Click "Add" to create one.
                </div>
            ) : (
                <div className="space-y-1">
                    {activities.map((activity) => (
                        <div
                            key={activity.id}
                            className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-blue-200 transition-colors"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">
                                    {activity.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Max Marks: {activity.defaultMaxMarks} | Order:{" "}
                                    {activity.sortOrder}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onEdit(activity)}
                                    className="h-7 w-7 p-0"
                                >
                                    <Edit3 className="h-3 w-3" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onDelete(activity)}
                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

