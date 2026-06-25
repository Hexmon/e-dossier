import { api } from '@/app/lib/apiClient';
import { endpoints } from '@/constants/endpoints';

export type WarningTriggerType = 'SINGLE_TERM' | 'TWO_TERM_CUMULATIVE';

export type WarningCriterion = {
  criterionKey: string;
  positionKey: string;
  positionName: string;
  triggerType: WarningTriggerType;
  restrictionPoints: number;
  isEnabled: boolean;
};

export type WarningSettingsResponse = {
  message: string;
  intro: string;
  criteria: WarningCriterion[];
};

export type WarningNotification = {
  id: string;
  title: string;
  message: string;
  ocId: string;
  ocNo: string | null;
  ocName: string;
  appointmentName: string;
  triggerType: WarningTriggerType;
  restrictionPoints: number;
  actualPoints: number;
  semesterLabel: string;
  deepLink: string;
  relegationLink: string | null;
  isDisciplineRelegationEligible: boolean;
  canMarkForRelegation: boolean;
  readAt: string | null;
  createdAt: string;
};

export type WarningNotificationsResponse = {
  message: string;
  items: WarningNotification[];
  count: number;
  unreadCount: number;
};

export type WarningNotificationAction =
  | { action: 'MARK_AS_READ'; notificationId: string }
  | { action: 'MARK_ALL_AS_READ' };

export const warningManagementApi = {
  getSettings: () => api.get<WarningSettingsResponse>(endpoints.admin.warningManagement),
  updateSettings: (payload: { criteria: WarningCriterion[] }) =>
    api.put<WarningSettingsResponse, typeof payload>(endpoints.admin.warningManagement, payload),
  getNotifications: () => api.get<WarningNotificationsResponse>(endpoints.me.warningNotifications),
  applyNotificationAction: (payload: WarningNotificationAction) =>
    api.post<WarningNotificationsResponse, WarningNotificationAction>(
      endpoints.me.warningNotifications,
      payload,
    ),
};
