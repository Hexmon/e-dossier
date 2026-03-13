"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UniversalTable, type TableConfig } from "@/components/layout/TableLayout";
import { useInterviewPendingTickerSettings } from "@/hooks/useInterviewPendingTickerSettings";
import { useMe } from "@/hooks/useMe";
import {
  canAccessInterviewPendingTickerSetting,
  getDaysBetweenDates,
} from "@/lib/interview-pending-ticker";
import { formatInDefaultTimezone } from "@/lib/timezone";
import { toast } from "sonner";

type LogRow = {
  name: string;
  date: string;
  days: number;
  startDate: string;
  endDate: string;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function TickerSettingsPage() {
  const { data: meData, isLoading: meLoading } = useMe();
  const { query, createMutation } = useInterviewPendingTickerSettings({
    includeLogs: true,
    limit: 100,
    offset: 0,
  });

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  const canManageTicker = canAccessInterviewPendingTickerSetting({
    roles: meData?.roles ?? [],
    position: meData?.apt?.position ?? null,
    scopeType: meData?.apt?.scope?.type ?? null,
  });

  useEffect(() => {
    if (isInitialized || !query.isSuccess) return;

    const setting = query.data.setting;
    if (setting) {
      setStartDate(setting.startDate);
      setEndDate(setting.endDate);
    } else {
      const today = todayIsoDate();
      setStartDate(today);
      setEndDate(today);
    }
    setIsInitialized(true);
  }, [isInitialized, query.data?.setting, query.isSuccess]);

  const computedDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return getDaysBetweenDates(startDate, endDate);
  }, [startDate, endDate]);

  const latestSetting = query.data?.setting ?? null;
  const logs = query.data?.logs ?? [];

  const tableRows = useMemo<LogRow[]>(
    () =>
      logs.map((row) => ({
        name: row.createdByUsername ?? "Unknown User",
        date: formatInDefaultTimezone(row.createdAt, {
          dateStyle: "medium",
          timeStyle: "short",
        }),
        days: row.days,
        startDate: row.startDate,
        endDate: row.endDate,
      })),
    [logs]
  );

  const tableConfig: TableConfig<LogRow> = {
    columns: [
      {
        key: "name",
        label: "Name",
        type: "text",
        sortable: true,
        filterable: false,
      },
      {
        key: "date",
        label: "Date",
        type: "text",
        sortable: true,
        filterable: false,
      },
      {
        key: "days",
        label: "Days",
        type: "number",
        sortable: true,
        filterable: false,
      },
      {
        key: "startDate",
        label: "Start Date",
        type: "text",
        sortable: true,
        filterable: false,
      },
      {
        key: "endDate",
        label: "End Date",
        type: "text",
        sortable: true,
        filterable: false,
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
    loading: query.isLoading,
    emptyState: {
      message: "No ticker setting logs found.",
    },
  };

  const handleSave = async () => {
    if (!startDate || !endDate) {
      toast.error("Start date and end date are required.");
      return;
    }

    if (startDate > endDate) {
      toast.error("End date must be on or after start date.");
      return;
    }

    try {
      await createMutation.mutateAsync({ startDate, endDate });
      toast.success("Ticker setting saved successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save ticker setting.";
      toast.error(message);
    }
  };

  if (meLoading) {
    return (
      <DashboardLayout title="Ticker Setting" description="Configure interview pending marquee days">
        <section className="space-y-6 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
            </CardHeader>
          </Card>
        </section>
      </DashboardLayout>
    );
  }

  if (!canManageTicker) {
    return (
      <DashboardLayout title="Ticker Setting" description="Configure interview pending marquee days">
        <section className="space-y-6 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Access Restricted</CardTitle>
              <CardDescription>You do not have permission to manage ticker settings.</CardDescription>
            </CardHeader>
          </Card>
        </section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Ticker Setting" description="Configure interview pending marquee days">
      <section className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Configure Interview Pending Days</CardTitle>
            <CardDescription>
              Select start and end dates. The difference between these dates is used for marquee text:
              INTERVIEW PENDING BY {"<days>"} DAYS.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="ticker-start-date">Start Date</Label>
                <Input
                  id="ticker-start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticker-end-date">End Date</Label>
                <Input
                  id="ticker-end-date"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Computed Days</Label>
                <Input value={String(computedDays)} readOnly />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-xs text-muted-foreground">
                {latestSetting
                  ? `Current active setting: ${latestSetting.startDate} to ${latestSetting.endDate} (${latestSetting.days} days)`
                  : "No active setting found. Save one to start marquee output."}
              </div>
              <Button type="button" onClick={handleSave} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : "Save Ticker Setting"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ticker Setting Logs</CardTitle>
            <CardDescription>Shows all recorded ticker day configurations, who changed them, and when.</CardDescription>
          </CardHeader>
          <CardContent>
            <UniversalTable<LogRow> data={tableRows} config={tableConfig} />
          </CardContent>
        </Card>
      </section>
    </DashboardLayout>
  );
}
