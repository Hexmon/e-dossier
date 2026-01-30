"use client";

import { Edit3, Trash2 } from "lucide-react";
import type { TrainingCamp } from "@/app/lib/api/trainingCampsApi";
import type { TrainingCampActivity } from "@/app/lib/api/trainingCampActivitiesApi";
import {
    UniversalTable,
    type TableColumn,
    type TableAction,
    type TableConfig,
} from "@/components/layout/TableLayout";
import ActivitiesList from "./ActivitiesList";

type CampRow = TrainingCamp;

interface CampsTableProps {
    camps: TrainingCamp[];
    onEdit?: (camp: TrainingCamp) => void;
    onDelete?: (camp: TrainingCamp) => void;
    onAddActivity?: (camp: TrainingCamp) => void;
    onEditActivity?: (camp: TrainingCamp, activity: TrainingCampActivity) => void;
    onDeleteActivity?: (camp: TrainingCamp, activity: TrainingCampActivity) => void;
    loading?: boolean;
}

const semesterLabels: Record<string, string> = {
    SEM5: "Semester 5",
    SEM6A: "Semester 6A",
    SEM6B: "Semester 6B",
};

export default function CampsTable({
    camps,
    onEdit,
    onDelete,
    onAddActivity,
    onEditActivity,
    onDeleteActivity,
    loading = false,
}: CampsTableProps) {
    const columns: TableColumn<CampRow>[] = [
        {
            key: "name",
            label: "Camp Name",
            type: "text",
        },
        {
            key: "semester",
            label: "Semester",
            type: "custom",
            render: (value) => semesterLabels[value as string] || value,
        },
        {
            key: "maxTotalMarks",
            label: "Max Total Marks",
            type: "number",
        },
        {
            key: "activities",
            label: "Activities",
            type: "custom",
            render: (value, row) => {
                const activities = (value as TrainingCampActivity[]) || [];
                return (
                    <ActivitiesList
                        activities={activities}
                        onAdd={() => onAddActivity?.(row)}
                        onEdit={(activity) => onEditActivity?.(row, activity)}
                        onDelete={(activity) => onDeleteActivity?.(row, activity)}
                    />
                );
            },
        },
        {
            key: "createdAt",
            label: "Created At",
            type: "custom",
            render: (value) => new Date(value as string).toLocaleDateString(),
        },
    ];

    const actions: TableAction<CampRow>[] = [];

    if (onEdit) {
        actions.push({
            key: "edit",
            label: "Edit",
            icon: Edit3,
            handler: (camp: CampRow) => onEdit(camp),
            variant: "ghost",
        });
    }

    if (onDelete) {
        actions.push({
            key: "delete",
            label: "Delete",
            icon: Trash2,
            handler: (camp: CampRow) => onDelete(camp),
            variant: "ghost",
            className: "text-destructive hover:text-destructive",
        });
    }

    const tableConfig: TableConfig<CampRow> = {
        columns,
        actions,
        features: {
            pagination: false,
        },
        emptyState: {
            message: "No camps found",
        },
        styling: {
            bordered: true,
            hover: true,
            striped: false,
        },
        theme: {
            variant: "blue",
        },
        loading,
    };

    return (
        <div className="space-y-3 bg-card/50 p-3 rounded-lg shadow-md backdrop-blur">
            <UniversalTable<CampRow>
                data={camps}
                config={tableConfig}
            />
        </div>
    );
}

