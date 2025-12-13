"use client";

import { Edit3, Trash2, User } from "lucide-react";
import type { Instructor } from "@/app/lib/api/instructorsApi";
import {
    UniversalTable,
    type TableColumn,
    type TableAction,
    type TableConfig,
} from "@/components/layout/TableLayout";
import { Button } from "@/components/ui/button";

type InstructorRow = Instructor;

type ServerPaginationProps = {
    mode: "server";
    currentPage: number;
    pageSize: number;
    totalCount: number;
    onPageChange: (page: number, pageSize: number) => void;
};

type LoadMoreConfig = {
    hasMore: boolean;
    onLoadMore: () => void;
    loadingMore?: boolean;
    label?: string;
};

type Props = {
    instructorList: InstructorRow[];
    onEdit: (index: number) => void;
    onDelete: (id: string) => void;
    pagination?: ServerPaginationProps;
    loading?: boolean;
    loadMore?: LoadMoreConfig;
};

export default function InstructorsTable({
    instructorList,
    onEdit,
    onDelete,
    pagination,
    loading,
    loadMore,
}: Props) {
    const columns: TableColumn<InstructorRow>[] = [
        {
            key: "name",
            label: "Name",
            type: "text",
        },
        {
            key: "email",
            label: "Email",
            type: "text",
        },
        {
            key: "phone",
            label: "Phone",
            type: "text",
        },
        {
            key: "affiliation",
            label: "Affiliation",
            type: "text",
        },
        {
            key: "notes",
            label: "Notes",
            type: "custom",
            render: (value) => {
                const notes = value as string | undefined;
                if (!notes) return <span className="text-muted-foreground">—</span>;
                return (
                    <span className="text-sm line-clamp-1" title={notes}>
                        {notes}
                    </span>
                );
            },
        },
    ];

    const actions: TableAction<InstructorRow>[] = [
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

    const tableConfig: TableConfig<InstructorRow> = {
        columns,
        actions,
        features: {
            pagination: !!pagination,
        },
        pagination: pagination
            ? {
                mode: "server",
                pageSize: pagination.pageSize,
                totalItems: pagination.totalCount,
                currentPage: pagination.currentPage,
            }
            : undefined,
        emptyState: {
            message: "No instructors found",
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
            <UniversalTable<InstructorRow>
                data={instructorList}
                config={tableConfig}
                onPageChange={
                    pagination
                        ? (page, pageSize) => pagination.onPageChange(page, pageSize)
                        : undefined
                }
            />

            {loadMore && loadMore.hasMore && (
                <div className="flex justify-center">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={loadMore.onLoadMore}
                        disabled={loadMore.loadingMore}
                    >
                        {loadMore.loadingMore
                            ? "Loading..."
                            : loadMore.label ?? "Load More"}
                    </Button>
                </div>
            )}
        </div>
    );
}