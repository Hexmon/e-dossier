"use client";

import React, { useEffect, useRef, useState } from "react";
import { api } from "@/app/lib/apiClient";
import { UniversalTable, TableConfig } from "@/components/layout/TableLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type InterviewPendingRow = {
  ocNo: string;
  rankAndName: string;
  course: string | null;
  platoon: string | null;
  completeSpecial: boolean;
};

type InterviewPendingResponse = {
  items: InterviewPendingRow[];
  count: number;
};

type PendingTableRow = {
  ocNo: string;
  rankAndName: string;
  course: string | null;
};

export default function InterviewsPending() {
  const [rows, setRows] = useState<PendingTableRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;

    const loadPending = async () => {
      setIsLoading(true);
      setError(null);

      const pageSize = 1000;
      let offset = 0;
      let page = 0;
      const maxPages = 20;
      const allRows: InterviewPendingRow[] = [];

      try {
        while (page < maxPages) {
          const res = await api.get<InterviewPendingResponse>("/api/v1/admin/interview/pending", {
            query: {
              active: "true",
              limit: pageSize,
              offset,
              sort: "name_asc",
            },
          });

          const batch = Array.isArray(res.items) ? res.items : [];
          allRows.push(...batch);

          if (batch.length < pageSize) break;
          offset += pageSize;
          page += 1;
        }

        const pendingOnly = allRows
          .filter((item) => !item.completeSpecial)
          .map((item) => ({
            ocNo: item.ocNo,
            rankAndName: item.rankAndName,
            course: item.course,
          }));

        setRows(pendingOnly);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load pending interviews";
        setError(message);
        setRows([]);
        console.error("Failed to load pending interviews", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPending();
  }, []);

  const tableConfig: TableConfig<PendingTableRow> = {
    columns: [
      {
        key: "ocNo",
        label: "OC No",
        type: "text",
        sortable: true,
        filterable: false,
      },
      {
        key: "rankAndName",
        label: "Rank & Name",
        type: "text",
        sortable: true,
        filterable: false,
      },
      {
        key: "course",
        label: "Course",
        type: "custom",
        sortable: true,
        filterable: false,
        render: (value) => (value ? String(value) : "-"),
      },
    ],
    features: {
      sorting: true,
      pagination: true,
      search: false,
    },
    pagination: {
      pageSize: 10,
    },
    theme: {
      variant: "blue",
    },
    styling: {
      compact: false,
      bordered: true,
      striped: true,
      hover: true,
    },
    loading: isLoading,
    emptyState: {
      message: error ?? "No pending interviews found",
    },
  };

  return (
    <div className="container mx-auto py-2">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-primary-foreground bg-primary p-2 rounded">
            Interviews Pending
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UniversalTable<PendingTableRow> data={rows} config={tableConfig} />
        </CardContent>
      </Card>
    </div>
  );
}
