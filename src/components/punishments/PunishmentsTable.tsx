"use client";

import { Edit3, Trash2 } from "lucide-react";
import type { Punishment } from "@/app/lib/api/punishmentsApi";
import {
    UniversalTable,
    type TableColumn,
    type TableAction,
    type TableConfig,
} from "@/components/layout/TableLayout";
import { Button } from "@/components/ui/button";

type PunishmentRow = Punishment;

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
    punishmentList: PunishmentRow[];
    onEdit: (index: number) => void;
    onDelete: (id: string) => void;
    pagination?: ServerPaginationProps;
    loading?: boolean;
    loadMore?: LoadMoreConfig;
};

export default function PunishmentsTable({
    punishmentList,
    onEdit,
    onDelete,
    pagination,
    loading,
    loadMore,
}: Props) {
    const columns: TableColumn<PunishmentRow>[] = [
        {
            key: "title",
            label: "Punishment Title",
            type: "text",
        },
        {
            key: "marksDeduction",
            label: "Marks Deduction",
            type: "custom",
            render: (value) => {
                const marks = value as number;
                return (
                    <span className="font-medium text-destructive">
                        -{marks} marks
                    </span>
                );
            },
        },
    ];

    const actions: TableAction<PunishmentRow>[] = [
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

    const tableConfig: TableConfig<PunishmentRow> = {
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
            message: "No punishments found",
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
            <UniversalTable<PunishmentRow>
                data={punishmentList}
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