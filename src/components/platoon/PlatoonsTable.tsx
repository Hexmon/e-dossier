"use client";

import { Eye, Edit3, Trash2 } from "lucide-react";
import { Platoon } from "@/types/platoon";
import { UniversalTable, TableConfig } from "@/components/layout/TableLayout";

interface PlatoonsTableProps {
    platoons: Platoon[];
    isLoading: boolean;
    onView: (platoon: Platoon) => void;
    onEdit: (platoon: Platoon) => void;
    onDelete: (id: string) => void;
}

export default function PlatoonsTable({
    platoons,
    isLoading,
    onView,
    onEdit,
    onDelete,
}: PlatoonsTableProps) {
    const tableConfig: TableConfig<Platoon> = {
        columns: [
            {
                key: "key",
                label: "Platoon Key",
                sortable: true,
                filterable: true,
                width: "150px",
                className: "font-medium",
            },
            {
                key: "name",
                label: "Platoon Name",
                sortable: true,
                filterable: true,
                className: "font-semibold",
            },
            {
                key: "about",
                label: "Description",
                sortable: false,
                filterable: true,
                render: (value) => (
                    <span className="text-sm text-muted-foreground line-clamp-2">
                        {value || "No description"}
                    </span>
                ),
            },
            {
                key: "createdAt",
                label: "Created",
                type: "date",
                sortable: true,
                width: "150px",
            },
            {
                key: "updatedAt",
                label: "Last Updated",
                type: "date",
                sortable: true,
                width: "150px",
            },
        ],
        actions: [
            {
                key: "view",
                label: "View",
                icon: Eye,
                variant: "outline",
                size: "sm",
                handler: (row) => onView(row),
            },
            {
                key: "edit",
                label: "Edit",
                icon: Edit3,
                variant: "outline",
                size: "sm",
                handler: (row) => onEdit(row),
            },
            {
                key: "delete",
                label: "Delete",
                icon: Trash2,
                variant: "outline",
                size: "sm",
                handler: (row) => onDelete(row.id),
                className: "text-destructive hover:text-destructive",
            },
        ],
        features: {
            sorting: true,
            filtering: true,
            pagination: true,
            search: true,
        },
        styling: {
            hover: true,
            striped: true,
            bordered: true,
        },
        pagination: {
            pageSize: 10,
            mode: "client",
        },
        emptyState: {
            message: "No platoons found. Click 'Add Platoon' to create one.",
        },
        loading: isLoading,
    };

    return <UniversalTable<Platoon> data={platoons} config={tableConfig} />;
}