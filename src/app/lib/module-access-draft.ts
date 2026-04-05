export type ModuleAccessDraft = {
  adminCanAccessDossier: boolean;
  adminCanAccessBulkUpload: boolean;
  adminCanAccessReports: boolean;
};

type ModuleAccessSettingsShape = ModuleAccessDraft | null | undefined;

export function emptyModuleAccessDraft(): ModuleAccessDraft {
  return {
    adminCanAccessDossier: false,
    adminCanAccessBulkUpload: false,
    adminCanAccessReports: false,
  };
}

export function toModuleAccessDraft(
  settings: ModuleAccessSettingsShape
): ModuleAccessDraft {
  if (!settings) {
    return emptyModuleAccessDraft();
  }

  return {
    adminCanAccessDossier: settings.adminCanAccessDossier,
    adminCanAccessBulkUpload: settings.adminCanAccessBulkUpload,
    adminCanAccessReports: settings.adminCanAccessReports,
  };
}

export function reconcileModuleAccessDraft(params: {
  currentDraft: ModuleAccessDraft;
  incomingSettings: ModuleAccessSettingsShape;
  hasLocalEdits: boolean;
}): ModuleAccessDraft {
  if (params.hasLocalEdits || !params.incomingSettings) {
    return params.currentDraft;
  }

  return toModuleAccessDraft(params.incomingSettings);
}
