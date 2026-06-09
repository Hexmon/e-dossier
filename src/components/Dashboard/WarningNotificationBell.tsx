"use client";

import { Bell } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { warningManagementApi } from "@/app/lib/api/warningManagementApi";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function WarningNotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["warning-notifications"],
    queryFn: () => warningManagementApi.getNotifications(),
    refetchInterval: 60_000,
  });

  const actionMutation = useMutation({
    mutationFn: warningManagementApi.applyNotificationAction,
    onSuccess: (data) => queryClient.setQueryData(["warning-notifications"], data),
  });

  const notifications = query.data?.items ?? [];
  const unreadCount = query.data?.unreadCount ?? 0;

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
        <div className="max-h-96 overflow-y-auto p-2">
          {query.isLoading ? (
            <p className="p-3 text-sm text-muted-foreground">Loading notifications...</p>
          ) : query.error ? (
            <p className="p-3 text-sm text-destructive">{(query.error as Error).message}</p>
          ) : notifications.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No warning notifications.</p>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={`space-y-2 rounded-md border p-3 text-sm ${item.readAt ? "opacity-55" : "bg-muted/30"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{item.ocName}</span>
                  <Badge variant={item.readAt ? "outline" : "secondary"}>
                    {item.actualPoints}/{item.restrictionPoints}
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
