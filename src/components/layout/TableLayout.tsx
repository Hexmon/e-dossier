"use client";

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronUp, ChevronDown, Search, Edit3, Trash2, Eye } from "lucide-react";
import { resolveStatusToneClasses } from "@/lib/theme-color";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Core type definitions
export interface TableColumn<T = any> {
    key: keyof T | string;
    label: string;
    type?: 'text' | 'number' | 'date' | 'status' | 'custom';
    width?: string;
    sortable?: boolean;
    filterable?: boolean;
    render?: (value: any, row: T, index: number) => React.ReactNode;
    className?: string;
}

export interface TableAction<T = any> {
    key: string;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    variant?: 'default' | 'outline' | 'destructive' | 'ghost';
    size?: 'sm' | 'default' | 'lg';
    handler: (row: T, index: number) => void;
    condition?: (row: T, index: number) => boolean;
    className?: string;
}

export interface TableConfig<T = any> {
    columns: TableColumn<T>[];
    actions?: TableAction<T>[];
    features?: {
        sorting?: boolean;
        filtering?: boolean;
        pagination?: boolean;
        selection?: boolean;
        search?: boolean;
    };
    styling?: {
        compact?: boolean;
        bordered?: boolean;
        striped?: boolean;
        hover?: boolean;
        className?: string;
    };
    theme?: {
        variant?: 'default' | 'dark' | 'blue' | 'green' | 'custom';
        headerBg?: string;
        rowBg?: string;
        rowAltBg?: string;
        borderColor?: string;
        textColor?: string;
        headerTextColor?: string;
    };
    pagination?: {
        /**
         * Number of rows per page. Defaults to 10.
         */
        pageSize?: number;
        showSizeSelector?: boolean;
        /**
         * Pagination mode:
         * - 'client' (default): UniversalTable paginates the provided data array in-memory.
         * - 'server': parent component supplies already paginated data and total item count.
         */
        mode?: 'client' | 'server';
        /**
         * Total number of items across all pages (used in server-side mode).
         */
        totalItems?: number;
        /**
         * Controlled current page (1-based) for server-side mode.
         */
        currentPage?: number;
    };
    emptyState?: {
        message?: string;
        icon?: React.ComponentType<{ className?: string }>;
    };
    loading?: boolean;
}

export interface UniversalTableProps<T = any> {
    data: T[];
    config: TableConfig<T>;
    onSort?: (key: string, direction: 'asc' | 'desc') => void;
    onFilter?: (filters: Record<string, string>) => void;
    onPageChange?: (page: number, pageSize: number) => void;
    onSelectionChange?: (selectedRows: T[]) => void;
}

export function UniversalTable<T extends Record<string, any>>({
    data,
    config,
    onSort,
    onFilter,
    onPageChange,
    onSelectionChange,
}: UniversalTableProps<T>) {
    const [sortKey, setSortKey] = useState<string>('');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

    const {
        columns,
        actions = [],
        features = {},
        styling = {},
        theme = {},
        pagination = {},
        emptyState = {},
        loading = false,
    } = config;

    const themePresets = {
        default: {
            headerBg: 'bg-muted/50',
            rowBg: 'bg-background',
            rowAltBg: 'bg-muted/20',
            borderColor: 'border-border/50',
            textColor: 'text-foreground',
            headerTextColor: 'text-foreground',
        },
        dark: {
            headerBg: 'bg-muted',
            rowBg: 'bg-card',
            rowAltBg: 'bg-muted/40',
            borderColor: 'border-border',
            textColor: 'text-foreground',
            headerTextColor: 'text-foreground',
        },
        blue: {
            headerBg: 'bg-primary/10',
            rowBg: 'bg-background',
            rowAltBg: 'bg-primary/5',
            borderColor: 'border-primary/20',
            textColor: 'text-foreground',
            headerTextColor: 'text-foreground',
        },
        green: {
            headerBg: 'bg-success/15',
            rowBg: 'bg-background',
            rowAltBg: 'bg-success/10',
            borderColor: 'border-success/30',
            textColor: 'text-foreground',
            headerTextColor: 'text-foreground',
        },
        custom: theme,
    };

    const activeTheme = theme.variant
        ? themePresets[theme.variant]
        : themePresets.default;

    const isServerPagination = pagination.mode === 'server';

    // Filtering and searching logic (client-side only)
    const filteredData = useMemo(() => {
        let result = [...data];

        if (!isServerPagination) {
            // Apply search
            if (features.search && searchTerm) {
                result = result.filter((row) =>
                    columns.some((col) => {
                        const value = getNestedValue(row, col.key as string);
                        return String(value).toLowerCase().includes(searchTerm.toLowerCase());
                    })
                );
            }

            // Apply column filters
            Object.entries(filters).forEach(([key, value]) => {
                if (value) {
                    result = result.filter((row) => {
                        const rowValue = getNestedValue(row, key);
                        return String(rowValue).toLowerCase().includes(value.toLowerCase());
                    });
                }
            });
        }

        return result;
    }, [data, searchTerm, filters, columns, features.search, isServerPagination]);

    // Sorting logic (client-side only)
    const sortedData = useMemo(() => {
        if (!sortKey || !features.sorting || isServerPagination) return filteredData;

        return [...filteredData].sort((a, b) => {
            const aVal = getNestedValue(a, sortKey);
            const bVal = getNestedValue(b, sortKey);

            let comparison = 0;
            if (aVal < bVal) comparison = -1;
            if (aVal > bVal) comparison = 1;

            return sortDirection === 'desc' ? -comparison : comparison;
        });
    }, [filteredData, sortKey, sortDirection, features.sorting, isServerPagination]);

    // Pagination logic
    const pageSize = pagination.pageSize || 10;
    const clientTotalItems = sortedData.length;
    const serverTotalItems = pagination.totalItems ?? clientTotalItems;
    const totalItems = isServerPagination ? serverTotalItems : clientTotalItems;

    const effectivePage =
        isServerPagination && typeof pagination.currentPage === 'number'
            ? pagination.currentPage
            : currentPage;

    const totalPages = features.pagination
        ? Math.max(1, Math.ceil(totalItems / pageSize))
        : 1;

    const paginatedData = features.pagination
        ? isServerPagination
            ? sortedData
            : sortedData.slice((effectivePage - 1) * pageSize, effectivePage * pageSize)
        : sortedData;

    // Helper function to get nested values
    function getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    // Handle sorting
    const handleSort = (key: string) => {
        if (!features.sorting) return;

        const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
        setSortKey(key);
        setSortDirection(newDirection);
        onSort?.(key, newDirection);
    };

    // Handle filtering
    const handleFilter = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        onFilter?.(newFilters);
        setCurrentPage(1); // Reset to first page
    };

    // Handle selection
    const handleRowSelection = (index: number, checked: boolean) => {
        const newSelected = new Set(selectedRows);
        if (checked) {
            newSelected.add(index);
        } else {
            newSelected.delete(index);
        }
        setSelectedRows(newSelected);

        const selectedData = Array.from(newSelected).map((i) => paginatedData[i]);
        onSelectionChange?.(selectedData);
    };

    const handlePageChangeInternal = (nextPage: number) => {
        if (!features.pagination) return;

        if (!isServerPagination) {
            setCurrentPage(nextPage);
        }

        onPageChange?.(nextPage, pageSize);
    };

    // Render cell content
    const renderCell = (column: TableColumn<T>, row: T, index: number) => {
        const value = getNestedValue(row, column.key as string);

        if (column.render) {
            return column.render(value, row, index);
        }

        switch (column.type) {
            case 'date':
                return value ? new Date(value).toLocaleDateString() : '';
            case 'status':
                return (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${resolveStatusToneClasses(String(value ?? ""))}`}>
                        {value}
                    </span>
                );
            case 'number':
                return typeof value === 'number' ? value.toLocaleString() : value;
            default:
                return String(value || '');
        }
    };

    const tableClasses = [
        'rounded-md border border-border/50 overflow-x-auto overflow-y-hidden',
        styling.className,
    ].filter(Boolean).join(' ');

    if (loading) {
        return (
            <div className={tableClasses}>
                <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">Loading...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Search and filters */}
            {(features.search || features.filtering) && (
                <div className="flex gap-4 items-center">
                    {features.search && (
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Table */}
            <div className={tableClasses}>
                <table className="min-w-full text-sm ">
                    <thead className={`text-left ${activeTheme.headerTextColor}`}>
                        <tr className={`text-left ${activeTheme.headerBg}`}>
                            {features.selection && (
                                <th className="px-3 py-[var(--density-table-header-py)] w-12">
                                    <input
                                        type="checkbox"
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedRows(new Set(paginatedData.map((_, i) => i)));
                                            } else {
                                                setSelectedRows(new Set());
                                            }
                                        }}
                                    />
                                </th>
                            )}
                            {columns.map((column) => (
                                <th
                                    key={String(column.key)}
                                    className={`px-3 py-[var(--density-table-header-py)] ${column.className || ''} ${column.sortable && features.sorting ? 'cursor-pointer hover:bg-muted/70' : ''
                                        }`}
                                    style={{ width: column.width }}
                                    onClick={() => column.sortable && handleSort(String(column.key))}
                                >
                                    <div className="flex items-center gap-2">
                                        {column.label}
                                        {column.sortable && features.sorting && (
                                            <div className="flex flex-col">
                                                <ChevronUp className={`h-3 w-3 ${sortKey === column.key && sortDirection === 'asc' ? 'text-primary' : 'text-muted-foreground'
                                                    }`} />
                                                <ChevronDown className={`h-3 w-3 -mt-1 ${sortKey === column.key && sortDirection === 'desc' ? 'text-primary' : 'text-muted-foreground'
                                                    }`} />
                                            </div>
                                        )}
                                    </div>
                                    {column.filterable && features.filtering && (
                                        <Input
                                            placeholder={`Filter ${column.label}`}
                                            value={filters[String(column.key)] || ''}
                                            onChange={(e) => handleFilter(String(column.key), e.target.value)}
                                            className="mt-1 h-[var(--density-input-height-sm)]"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    )}
                                </th>
                            ))}
                            {actions.length > 0 && (
                                <th className="px-3 py-[var(--density-table-header-py)]">Actions</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className={activeTheme.textColor}>
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + (actions.length > 0 ? 1 : 0) + (features.selection ? 1 : 0)}
                                    className="px-3 py-6 text-center text-muted-foreground">
                                    {emptyState.message || 'No data found'}
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row, index) => (
                                <tr
                                    key={index}
                                    className={`border-t ${activeTheme.borderColor} ${styling.hover ? 'hover:opacity-90' : ''
                                        } ${styling.striped && index % 2 === 1
                                            ? activeTheme.rowAltBg
                                            : activeTheme.rowBg
                                        }`}
                                >
                                    {features.selection && (
                                        <td className="px-3 py-[var(--density-table-cell-py)]">
                                            <input
                                                type="checkbox"
                                                checked={selectedRows.has(index)}
                                                onChange={(e) => handleRowSelection(index, e.target.checked)}
                                            />
                                        </td>
                                    )}
                                    {columns.map((column) => (
                                        <td
                                            key={String(column.key)}
                                            className={`px-3 py-[var(--density-table-cell-py)] ${styling.compact ? 'py-1' : ''} ${column.className || ''}`}
                                        >
                                            {renderCell(column, row, index)}
                                        </td>
                                    ))}
                                    {actions.length > 0 && (
                                        <td className="px-3 py-[var(--density-table-cell-py)]">
                                            <div className="flex flex-wrap gap-2">
                                                {actions.map((action) => {
                                                    if (action.condition && !action.condition(row, index)) {
                                                        return null;
                                                    }

                                                    const actionLabel = action.label?.toLowerCase?.() ?? "";
                                                    const isEdit = actionLabel.includes("edit");
                                                    const isDelete = actionLabel.includes("delete");
                                                    const isView = actionLabel.includes("view");
                                                    const actionType = isEdit ? "edit" : isDelete ? "delete" : isView ? "view" : "";
                                                    const mappedIcon =
                                                        actionType === "edit"
                                                            ? Edit3
                                                            : actionType === "delete"
                                                                ? Trash2
                                                                : actionType === "view"
                                                                    ? Eye
                                                                    : undefined;
                                                    const IconComponent = action.icon ?? mappedIcon;
                                                    const iconOnly = actionType === "edit" || actionType === "delete" || actionType === "view";
                                                    const showLabel = !iconOnly;
                                                    const iconClass = `h-3 w-3${showLabel ? " mr-1" : ""}`;
                                                    const buttonClass =
                                                        `${action.className ?? ""} ${iconOnly ? "px-2" : ""}`.trim();

                                                    const actionButton = (
                                                        <Button
                                                            type="button"
                                                            variant={action.variant || 'outline'}
                                                            size={action.size || 'sm'}
                                                            onClick={() => action.handler(row, index)}
                                                            className={buttonClass || undefined}
                                                            aria-label={iconOnly ? action.label : undefined}
                                                        >
                                                            {IconComponent && <IconComponent className={iconClass} />}
                                                            {showLabel && action.label}
                                                            {iconOnly && <span className="sr-only">{action.label}</span>}
                                                        </Button>
                                                    );

                                                    if (!iconOnly) {
                                                        return (
                                                            <React.Fragment key={action.key}>
                                                                {actionButton}
                                                            </React.Fragment>
                                                        );
                                                    }

                                                    return (
                                                        <Tooltip key={action.key}>
                                                            <TooltipTrigger asChild>{actionButton}</TooltipTrigger>
                                                            <TooltipContent side="top">
                                                                {action.label}
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {features.pagination && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        {totalItems > 0 ? (
                            <>
                                Showing {(effectivePage - 1) * pageSize + 1} to{" "}
                                {Math.min(effectivePage * pageSize, totalItems)} of {totalItems} results
                            </>
                        ) : (
                            <>No results</>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={effectivePage === 1}
                            onClick={() => handlePageChangeInternal(effectivePage - 1)}
                        >
                            Previous
                        </Button>
                        <span className="flex items-center px-3 text-sm">
                            Page {Math.max(1, effectivePage)} of {Math.max(1, totalPages)}
                        </span>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={effectivePage === totalPages || totalItems === 0}
                            onClick={() => handlePageChangeInternal(effectivePage + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

        </div>
    );
}
