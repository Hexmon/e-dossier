import { api } from '@/app/lib/apiClient';
import { endpoints } from '@/constants/endpoints';

export type WorkflowModule = 'ACADEMICS_BULK' | 'PT_BULK';
export type WorkflowStatus = 'DRAFT' | 'PENDING_VERIFICATION' | 'CHANGES_REQUESTED' | 'VERIFIED';
export type WorkflowAction =
  | 'SAVE_DRAFT'
  | 'SUBMIT_FOR_VERIFICATION'
  | 'REQUEST_CHANGES'
  | 'VERIFY_AND_PUBLISH'
  | 'OVERRIDE_PUBLISH';

export type WorkflowUserSummary = {
  id: string;
  name: string;
  rank: string;
  username: string;
};

export type WorkflowSettingsSummary = {
  module: WorkflowModule;
  dataEntryUserIds: string[];
  verificationUserIds: string[];
  postVerificationOverrideMode: 'SUPER_ADMIN_ONLY' | 'ADMIN_AND_SUPER_ADMIN';
  isActive: boolean;
  dataEntryUsers: WorkflowUserSummary[];
  verificationUsers: WorkflowUserSummary[];
};

export type WorkflowTicketSummary = {
  id: string | null;
  status: WorkflowStatus;
  currentRevision: number | null;
  draftUpdatedAt: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  lastActorUserId: string | null;
  lastActorMessage: string | null;
};

export type WorkflowActivityEvent = {
  id: string;
  eventType: WorkflowAction;
  fromStatus: WorkflowStatus | null;
  toStatus: WorkflowStatus | null;
  message: string | null;
  createdAt: string;
  actor: WorkflowUserSummary | null;
};

export type AcademicsWorkflowDraftItem = {
  ocId: string;
  ocNo: string;
  name: string;
  branch?: string | null;
  theory?: {
    phaseTest1Marks?: number | null;
    phaseTest2Marks?: number | null;
    tutorial?: string | null;
    finalMarks?: number | null;
    grade?: string | null;
  };
  practical?: {
    finalMarks?: number | null;
    tutorial?: string | null;
    grade?: string | null;
  };
};

export type AcademicsWorkflowDraftPayload = {
  courseId: string;
  semester: number;
  subjectId: string;
  subject: {
    id: string;
    code: string;
    name: string;
    branch?: string | null;
    hasTheory?: boolean;
    hasPractical?: boolean;
    defaultTheoryCredits?: number | null;
    defaultPracticalCredits?: number | null;
  };
  items: AcademicsWorkflowDraftItem[];
};

export type PtWorkflowDraftScore = {
  ptTaskScoreId: string;
  marksScored: number;
  remark?: string | null;
};

export type PtWorkflowDraftMotivationValue = {
  fieldId: string;
  value?: string | null;
};

export type PtWorkflowDraftPayload = {
  courseId: string;
  semester: number;
  template: any;
  items: Array<{
    oc: {
      id: string;
      ocNo: string;
      name: string;
      branch?: string | null;
      platoonId?: string | null;
      platoonKey?: string | null;
      platoonName?: string | null;
      withdrawnOn?: string | null;
    };
    scores: PtWorkflowDraftScore[];
    motivationValues: PtWorkflowDraftMotivationValue[];
  }>;
};

export type AcademicsWorkflowStateResponse = {
  message: string;
  settings: WorkflowSettingsSummary;
  ticket: WorkflowTicketSummary;
  currentRevision: number | null;
  allowedActions: WorkflowAction[];
  liveSnapshot: AcademicsWorkflowDraftPayload;
  draftPayload: AcademicsWorkflowDraftPayload;
  activityLog: WorkflowActivityEvent[];
  selectionLabel: string;
  courseLabel: string;
};

export type PtWorkflowStateResponse = {
  message: string;
  settings: WorkflowSettingsSummary;
  ticket: WorkflowTicketSummary;
  currentRevision: number | null;
  allowedActions: WorkflowAction[];
  liveSnapshot: PtWorkflowDraftPayload;
  draftPayload: PtWorkflowDraftPayload;
  activityLog: WorkflowActivityEvent[];
  selectionLabel: string;
  courseLabel: string;
};

export type SaveDraftAction<TPayload> = {
  action: 'SAVE_DRAFT';
  revision?: number | null;
  payload: TPayload;
  message?: string;
};

export type SubmitForVerificationAction = {
  action: 'SUBMIT_FOR_VERIFICATION';
  revision: number;
};

export type RequestChangesAction = {
  action: 'REQUEST_CHANGES';
  revision: number;
  message: string;
};

export type VerifyAndPublishAction = {
  action: 'VERIFY_AND_PUBLISH';
  revision: number;
  message?: string;
};

export type OverridePublishAction<TPayload> = {
  action: 'OVERRIDE_PUBLISH';
  revision: number;
  payload: TPayload;
  message: string;
};

export type AcademicsWorkflowActionInput =
  | SaveDraftAction<AcademicsWorkflowDraftPayload>
  | SubmitForVerificationAction
  | RequestChangesAction
  | VerifyAndPublishAction
  | OverridePublishAction<AcademicsWorkflowDraftPayload>;

export type PtWorkflowActionInput =
  | SaveDraftAction<PtWorkflowDraftPayload>
  | SubmitForVerificationAction
  | RequestChangesAction
  | VerifyAndPublishAction
  | OverridePublishAction<PtWorkflowDraftPayload>;

export type MarksWorkflowSettingsResponse = {
  message: string;
  settings: {
    ACADEMICS_BULK: WorkflowSettingsSummary;
    PT_BULK: WorkflowSettingsSummary;
  };
};

export type WorkflowNotificationsResponse = {
  message: string;
  items: Array<{
    id: string;
    module: WorkflowModule;
    workflowStatus: WorkflowStatus;
    selectionLabel: string;
    message: string | null;
    deepLink: string;
    readAt: string | null;
    createdAt: string;
    actor: WorkflowUserSummary | null;
  }>;
  count: number;
  unreadCount: number;
};

export type WorkflowNotificationActionInput =
  | { action: 'MARK_AS_READ'; notificationId: string }
  | { action: 'MARK_ALL_AS_READ' };

export const marksWorkflowApi = {
  getAcademicsWorkflowState: async (query: {
    courseId: string;
    semester: number;
    subjectId: string;
  }): Promise<AcademicsWorkflowStateResponse> => {
    return api.get<AcademicsWorkflowStateResponse>(endpoints.oc.academics.workflow, {
      query,
    });
  },

  applyAcademicsWorkflowAction: async (
    query: { courseId: string; semester: number; subjectId: string },
    action: AcademicsWorkflowActionInput,
  ): Promise<AcademicsWorkflowStateResponse> => {
    return api.post<AcademicsWorkflowStateResponse, AcademicsWorkflowActionInput>(
      endpoints.oc.academics.workflow,
      action,
      { query },
    );
  },

  getPtWorkflowState: async (query: {
    courseId: string;
    semester: number;
  }): Promise<PtWorkflowStateResponse> => {
    return api.get<PtWorkflowStateResponse>(endpoints.oc.physicalTraining.workflow, {
      query,
    });
  },

  applyPtWorkflowAction: async (
    query: { courseId: string; semester: number },
    action: PtWorkflowActionInput,
  ): Promise<PtWorkflowStateResponse> => {
    return api.post<PtWorkflowStateResponse, PtWorkflowActionInput>(
      endpoints.oc.physicalTraining.workflow,
      action,
      { query },
    );
  },

  getSettings: async (): Promise<MarksWorkflowSettingsResponse> => {
    return api.get<MarksWorkflowSettingsResponse>(endpoints.admin.marksReviewWorkflow);
  },

  updateSettings: async (
    payload: {
      ACADEMICS_BULK: {
        dataEntryUserIds: string[];
        verificationUserIds: string[];
        postVerificationOverrideMode: 'SUPER_ADMIN_ONLY' | 'ADMIN_AND_SUPER_ADMIN';
      };
      PT_BULK: {
        dataEntryUserIds: string[];
        verificationUserIds: string[];
        postVerificationOverrideMode: 'SUPER_ADMIN_ONLY' | 'ADMIN_AND_SUPER_ADMIN';
      };
    },
  ): Promise<MarksWorkflowSettingsResponse> => {
    return api.put<MarksWorkflowSettingsResponse, typeof payload>(endpoints.admin.marksReviewWorkflow, payload);
  },

  getNotifications: async (): Promise<WorkflowNotificationsResponse> => {
    return api.get<WorkflowNotificationsResponse>(endpoints.me.workflowNotifications);
  },

  applyNotificationAction: async (
    payload: WorkflowNotificationActionInput,
  ): Promise<WorkflowNotificationsResponse> => {
    return api.post<WorkflowNotificationsResponse, WorkflowNotificationActionInput>(
      endpoints.me.workflowNotifications,
      payload,
    );
  },
};
