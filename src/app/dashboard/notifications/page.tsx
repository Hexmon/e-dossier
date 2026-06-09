"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { warningManagementApi } from "@/app/lib/api/warningManagementApi";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function WarningNotificationsPage() {
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryKey: ["warning-notifications"],
    queryFn: () => warningManagementApi.getNotifications(),
  });
  const actionMutation = useMutation({
    mutationFn: warningManagementApi.applyNotificationAction,
    onSuccess: (data) => queryClient.setQueryData(["warning-notifications"], data),
  });

  const notifications = notificationsQuery.data?.items ?? [];

  return (
    <DashboardLayout
      title="Notifications"
      description="Review appointment-based warning notifications."
    >
      <main className="space-y-6 p-6">
        <BreadcrumbNav
          paths={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Notifications" },
          ]}
        />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-primary">Warning Notifications</h2>
            <p className="text-muted-foreground">OCs who reached your current appointment warning threshold.</p>
          </div>
          <Button
            variant="outline"
            disabled={actionMutation.isPending || (notificationsQuery.data?.unreadCount ?? 0) === 0}
            onClick={() => actionMutation.mutate({ action: "MARK_ALL_AS_READ" })}
          >
            Mark all as read
          </Button>
        </div>

        {notificationsQuery.error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {(notificationsQuery.error as Error).message}
          </div>
        ) : null}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Warning notification</CardTitle>
            <Badge variant="outline">Unread {notificationsQuery.data?.unreadCount ?? 0}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {notificationsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading notifications...</p>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No warning notifications.</p>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-md border p-4 ${item.readAt ? "opacity-60" : "bg-muted/30"}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={item.readAt ? "outline" : "secondary"}>
                      {item.readAt ? "Read" : "Unread"}
                    </Badge>
                    <Badge variant="outline">{item.appointmentName}</Badge>
                    <Badge>{item.actualPoints}/{item.restrictionPoints} points</Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
                  </div>
                  <h3 className="mt-3 font-semibold">{item.ocName}{item.ocNo ? ` (${item.ocNo})` : ""}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.semesterLabel}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={Boolean(item.readAt) || actionMutation.isPending}
                      onClick={() => actionMutation.mutate({ action: "MARK_AS_READ", notificationId: item.id })}
                    >
                      Mark as read
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={item.deepLink}>View OC</Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </DashboardLayout>
  );
}
