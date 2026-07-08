"use client";

import { Bell } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { warningManagementApi, type WarningModule, type WarningNotification } from "@/app/lib/api/warningManagementApi";

const WARNING_NOTIFICATION_TABS: Array<{ value: WarningModule; label: string; emptyText: string }> = [
  { value: "DISCIPLINE", label: "Discipline", emptyText: "No discipline warning notifications." },
  { value: "MEDICAL", label: "Medical", emptyText: "No medical warning notifications." },
];

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function metricLabel(item: WarningNotification) {
  return item.module === "MEDICAL"
    ? `${item.actualAbsenceDays}/${item.absenceDays} days`
    : `${item.actualPoints}/${item.restrictionPoints}`;
}

export default function WarningNotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedModule, setSelectedModule] = useState<WarningModule>("DISCIPLINE");
  const query = useQuery({
    queryKey: ["warning-notifications"],
    queryFn: () => warningManagementApi.getNotifications(),
    refetchInterval: 60_000,
  });

  const actionMutation = useMutation({
    mutationFn: warningManagementApi.applyNotificationAction,
    onSuccess: (data) => queryClient.setQueryData(["warning-notifications"], data),
  });

  const notifications = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const unreadCount = query.data?.unreadCount ?? 0;
  const visibleNotifications = useMemo(
    () => notifications.filter((item) => item.module === selectedModule),
    [notifications, selectedModule],
  );
  const notificationCounts = useMemo(
    () => ({
      DISCIPLINE: notifications.filter((item) => item.module === "DISCIPLINE").length,
      MEDICAL: notifications.filter((item) => item.module === "MEDICAL").length,
    }),
    [notifications],
  );
  const activeTab = WARNING_NOTIFICATION_TABS.find((tab) => tab.value === selectedModule) ?? WARNING_NOTIFICATION_TABS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative h-9 w-9" aria-label="Warning notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-destructive px-1.5 text-xs font-semibold leading-5 text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="border-b p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Warning notification</p>
              <p className="text-xs text-muted-foreground">OCs matching your appointment criteria</p>
            </div>
            <Badge variant="outline">Unread {unreadCount}</Badge>
          </div>
        </div>
        <Tabs
          value={selectedModule}
          onValueChange={(value) => setSelectedModule(value as WarningModule)}
          className="border-b px-3 py-2"
        >
          <TabsList className="grid w-full grid-cols-2">
            {WARNING_NOTIFICATION_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
                <Badge variant="outline" className="ml-1">
                  {notificationCounts[tab.value]}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="max-h-96 overflow-y-auto p-2">
          {query.isLoading ? (
            <p className="p-3 text-sm text-muted-foreground">Loading notifications...</p>
          ) : query.error ? (
            <p className="p-3 text-sm text-destructive">{(query.error as Error).message}</p>
          ) : visibleNotifications.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">{activeTab.emptyText}</p>
          ) : (
            visibleNotifications.map((item) => (
              <div
                key={item.id}
                className={`space-y-2 rounded-md border p-3 text-sm ${item.readAt ? "opacity-55" : "bg-muted/30"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{item.ocName}</span>
                  <Badge variant={item.readAt ? "outline" : "secondary"}>
                    {metricLabel(item)}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{item.message}</p>
                <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={Boolean(item.readAt) || actionMutation.isPending}
                    onClick={() => actionMutation.mutate({ action: "MARK_AS_READ", notificationId: item.id })}
                  >
                    Mark as read
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => router.push("/dashboard/notifications")}>
                    View
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
