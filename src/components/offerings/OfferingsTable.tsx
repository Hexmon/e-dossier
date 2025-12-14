"use client";

import { Edit3, Trash2 } from "lucide-react";
import type { Offering } from "@/app/lib/api/offeringsApi";
import {
    UniversalTable,
    type TableColumn,
    type TableAction,
    type TableConfig,
} from "@/components/layout/TableLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type OfferingRow = Offering;

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
    offeringList: OfferingRow[];
    onEdit: (index: number) => void;
    onDelete: (id: string) => void;
    pagination?: ServerPaginationProps;
    loading?: boolean;
    loadMore?: LoadMoreConfig;
};

export default function OfferingsTable({
    offeringList,
    onEdit,
    onDelete,
    pagination,
    loading,
    loadMore,
}: Props) {
    const columns: TableColumn<OfferingRow>[] = [
        {
            key: "subjectCode",
            label: "Subject",
            type: "custom",
            render: (_value, row) => {
                const { subjectCode = "", subjectName = "" } = row;
                return (
                    <div className="flex flex-col">
                        <span className="font-medium">{subjectCode || "N/A"}</span>
                        <span className="text-xs text-muted-foreground">{subjectName || "—"}</span>
                    </div>
                );
            },
        },
        {
            key: "semester",
            label: "Semester",
            type: "custom",
            render: (value) => {
                const semester = value as number;
                return <span>Semester {semester}</span>;
            },
        },
        {
            key: "includeTheory",
            label: "Type",
            type: "custom",
            render: (_value, row) => {
                const { includeTheory = false, includePractical = false } = row;
                const types = [];
                if (includeTheory) types.push("Theory");
                if (includePractical) types.push("Practical");
                return (
                    <div className="flex gap-1">
                        {types.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                        ) : (
                            types.map((type) => (
                                <Badge key={type} variant="secondary" className="text-xs">
                                    {type}
                                </Badge>
                            ))
                        )}
                    </div>
                );
            },
        },
        {
            key: "theoryCredits",
            label: "Credits",
            type: "custom",
            render: (_value, row) => {
                const { theoryCredits = 0, practicalCredits = null } = row;
                const total = theoryCredits + (practicalCredits || 0);
                return (
                    <div className="flex flex-col">
                        <span className="font-medium">Total: {total}</span>
                        <span className="text-xs text-muted-foreground">
                            T: {theoryCredits}, P: {practicalCredits || 0}
                        </span>
                    </div>
                );
            },
        },
    ];

    const actions: TableAction<OfferingRow>[] = [
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

    const tableConfig: TableConfig<OfferingRow> = {
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
            message: "No offerings found",
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
            <UniversalTable<OfferingRow>
                data={offeringList}
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