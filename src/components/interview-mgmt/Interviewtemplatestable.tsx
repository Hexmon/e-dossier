"use client";

import { Edit3, Trash2, Eye } from "lucide-react";
import { InterviewTemplate } from "@/app/lib/api/Interviewtemplateapi";
import {
    UniversalTable,
    type TableColumn,
    type TableAction,
    type TableConfig,
} from "@/components/layout/TableLayout";
import { Badge } from "@/components/ui/badge";

type TemplateRow = InterviewTemplate;

type Props = {
    templates: TemplateRow[];
    onView: (index: number) => void;
    onEdit: (index: number) => void;
    onDelete: (id: string) => void;
    loading?: boolean;
};

export default function InterviewTemplatesTable({
    templates,
    onView,
    onEdit,
    onDelete,
    loading,
}: Props) {
    const columns: TableColumn<TemplateRow>[] = [
        {
            key: "code",
            label: "Code",
            type: "text",
            width: "150px",
            render: (value) => {
                const code = value as string;
                return (
                    <span className="font-mono text-sm font-medium">
                        {code || ""}
                    </span>
                );
            },
        },
        {
            key: "title",
            label: "Title",
            type: "text",
        },
        {
            key: "description",
            label: "Description",
            type: "text",
            render: (value) => {
                const desc = value as string | null;
                return (
                    <span className="text-sm text-muted-foreground line-clamp-2">
                        {desc || "No description"}
                    </span>
                );
            },
        },
        {
            key: "sortOrder",
            label: "Order",
            type: "number",
            width: "80px",
            render: (value) => {
                const order = value as number;
                return (
                    <span className="text-sm font-medium">
                        {order}
                    </span>
                );
            },
        },
        {
            key: "allowMultiple",
            label: "Multiple",
            type: "custom",
            width: "100px",
            render: (value) => {
                const allowed = value as boolean;
                return allowed ? (
                    <Badge variant="default" className="text-xs">
                        Yes
                    </Badge>
                ) : (
                    <Badge variant="secondary" className="text-xs">
                        No
                    </Badge>
                );
            },
        },
        {
            key: "isActive",
            label: "Status",
            type: "custom",
            width: "100px",
            render: (value) => {
                const active = value as boolean;
                return active ? (
                    <Badge variant="default" className="bg-success text-xs">
                        Active
                    </Badge>
                ) : (
                    <Badge variant="secondary" className="text-xs">
                        Inactive
                    </Badge>
                );
            },
        },
    ];

    const actions: TableAction<TemplateRow>[] = [
        {
            key: "view",
            label: "View",
            icon: Eye,
            variant: "outline",
            size: "sm",
            handler: (_row, index) => onView(index),
            className: "text-primary hover:bg-primary/10 hover:text-primary",
        },
        {
            key: "edit",
            label: "Edit",
            icon: Edit3,
            variant: "outline",
            size: "sm",
            handler: (_row, index) => onEdit(index),
        },
        {
            key: "delete",
            label: "Delete",
            icon: Trash2,
            variant: "outline",
            size: "sm",
            handler: (row) => {
                if (row.id) onDelete(row.id);
            },
            condition: (row) => !!row.id,
            className:
                "text-destructive hover:bg-destructive hover:text-destructive-foreground",
        },
    ];

    const tableConfig: TableConfig<TemplateRow> = {
        columns,
        actions,
        features: {
            pagination: true,
        },
        pagination: {
            pageSize: 10,
            mode: "client",
        },
        emptyState: {
            message: "No interview templates found",
        },
        styling: {
            className: "",
            hover: true,
            striped: false,
        },
        loading,
    };

    return (
        <div className="space-y-3">
            <UniversalTable<TemplateRow>
                data={templates}
                config={tableConfig}
            />
        </div>
    );
}