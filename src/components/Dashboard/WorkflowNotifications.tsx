'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { marksWorkflowApi } from '@/app/lib/api/marksWorkflowApi';

function getStatusTone(status: string): 'default' | 'secondary' | 'outline' {
  if (status === 'VERIFIED') return 'default';
  if (status === 'PENDING_VERIFICATION') return 'secondary';
  return 'outline';
}

export default function WorkflowNotifications() {
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryKey: ['workflow-notifications'],
    queryFn: () => marksWorkflowApi.getNotifications(),
  });

  const actionMutation = useMutation({
    mutationFn: marksWorkflowApi.applyNotificationAction,
    onSuccess: (data) => {
      queryClient.setQueryData(['workflow-notifications'], data);
    },
  });

  const notifications = notificationsQuery.data?.items ?? [];

  return (
    <Card className="w-full lg:col-span-2 mt-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Workflow Notifications</CardTitle>
          <p className="text-sm text-muted-foreground">
            Tickets submitted for verification, change requests, and publish updates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Unread {notificationsQuery.data?.unreadCount ?? 0}</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => actionMutation.mutate({ action: 'MARK_ALL_AS_READ' })}
            disabled={actionMutation.isPending || (notificationsQuery.data?.unreadCount ?? 0) === 0}
          >
            Mark All Read
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {notificationsQuery.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading workflow notifications...</div>
        ) : notificationsQuery.error ? (
          <div className="text-sm text-destructive">
            {(notificationsQuery.error as Error).message}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-sm text-muted-foreground">No workflow notifications.</div>
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => (
              <div key={item.id} className="rounded-md border px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={getStatusTone(item.workflowStatus)}>
                    {item.workflowStatus.replaceAll('_', ' ')}
                  </Badge>
                  <Badge variant="outline">{item.module === 'ACADEMICS_BULK' ? 'Academics' : 'PT'}</Badge>
                  {!item.readAt ? <Badge variant="secondary">Unread</Badge> : null}
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium">{item.selectionLabel}</p>
                {item.message ? <p className="mt-1 text-sm text-muted-foreground">{item.message}</p> : null}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-muted-foreground">
                    {item.actor ? `${item.actor.rank} ${item.actor.name}`.trim() : 'System'}
                  </span>
                  <Link href={item.deepLink} className="text-primary underline">
                    Open Ticket
                  </Link>
                  {!item.readAt ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => actionMutation.mutate({ action: 'MARK_AS_READ', notificationId: item.id })}
                      disabled={actionMutation.isPending}
                    >
                      Mark Read
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
