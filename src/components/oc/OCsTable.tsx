"use client";

import { Edit3, Trash2, Eye } from "lucide-react";
import type { OCListRow } from "@/app/lib/api/ocApi"; // better: use OCListRow (OC + denorm)
import { toDisplayDMY } from "@/app/lib/dateUtils";
import {
    UniversalTable,
    type TableColumn,
    type TableAction,
    type TableConfig,
} from "@/components/layout/TableLayout";
import { Button } from "@/components/ui/button";

// Row type actually used in the table: OC row + denorm fields
type OCRow = OCListRow;

type ServerPaginationProps = {
    mode: "server";
    currentPage: number;          // 1-based
    pageSize: number;
    totalCount: number;           // total items across all pages
    onPageChange: (page: number, pageSize: number) => void;
};

type LoadMoreConfig = {
    hasMore: boolean;
    onLoadMore: () => void;
    loadingMore?: boolean;
    label?: string;
};

type Props = {
    ocList: OCRow[];
    onView: (id: string) => void;
    onEdit: (index: number) => void;
    onDelete: (id: string) => void;
    pagination?: ServerPaginationProps;
    loading?: boolean;
    loadMore?: LoadMoreConfig; // optional: if you still want a "Load more" mode somewhere else
};

export default function OCsTable({
    ocList,
    onView,
    onEdit,
    onDelete,
    pagination,
    loading,
    loadMore,
}: Props) {
    const columns: TableColumn<OCRow>[] = [
        {
            key: "name",
            label: "Name",
            type: "text",
        },
        {
            key: "ocNo",
            label: "TES No",
            type: "text",
        },
        {
            key: "courseId",
            label: "Course",
            type: "custom",
            render: (_value, row) => row.courseCode ?? row.courseTitle ?? row.course?.id ?? "",
        },
        {
            key: "platoonId",
            label: "Platoon",
            type: "custom",
            render: (_value, row) =>
                row.platoonName ?? row.platoonKey ?? row.platoonId ?? "",
        },
        {
            key: "arrivalAtUniversity",
            label: "Arrival",
            type: "custom",
            render: (value) => toDisplayDMY(value),
        },
        {
            key: "withdrawnOn",
            label: "Status",
            type: "custom",
            render: (value) => {
                const status = value ? "inactive" : "active";
                return status === "inactive" ? (
                    <span className="text-destructive">inactive</span>
                ) : (
                    <span className="text-emerald-600">active</span>
                );
            },
        },
    ];

    const actions: TableAction<OCRow>[] = [
        {
            key: "view",
            label: "View",
            icon: Eye,
            variant: "outline",
            size: "sm",
            handler: (row) => {
                if (row.id) onView(row.id);
            },
            condition: (row) => !!row.id,
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
                "text-destructive hover:bg-destructive hover:text-primary-foreground",
        },
    ];

    const tableConfig: TableConfig<OCRow> = {
        columns,
        actions,
        features: {
            pagination: !!pagination,  // turn on pagination controls
            // sorting/filtering/search can be enabled here if needed
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
            message: "No OCs found",
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
            <UniversalTable<OCRow>
                data={ocList}
                config={tableConfig}
                // This is what triggers Next/Prev → parent fetch
                onPageChange={
                    pagination
                        ? (page, pageSize) => pagination.onPageChange(page, pageSize)
                        : undefined
                }
            />

            {/* Optional "Load more" button if you want a separate UX elsewhere */}
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
