export type PermissionActionLabel =
  | 'Create'
  | 'View'
  | 'Edit'
  | 'Delete'
  | 'Manage'
  | 'Access'
  | 'Upload'
  | 'Download';

export type PermissionDisplayMeta = {
  key: string;
  title: string;
  moduleLabel: string;
  areaLabel: string;
  description: string;
  actionLabel: PermissionActionLabel;
  isFallback: boolean;
};

const AREA_LABELS: Record<string, string> = {
  admin: 'Admin',
  oc: 'Cadet Record',
  page: 'Dashboard Page',
  reports: 'Reports',
  sidebar: 'Sidebar Access',
};

const MODULE_LABELS: Record<string, string> = {
  appointments: 'Appointments',
  'audit-logs': 'Audit Logs',
  courses: 'Courses',
  'courses:offerings': 'Course Offerings',
  discipline: 'Discipline Records',
  instructors: 'Instructors',
  interview: 'Interviews',
  'interview:templates': 'Interview Templates',
  'interview:pending': 'Interview Pending List',
  olq: 'OLQ',
  'physical-training': 'Physical Training',
  'physical-training:types': 'PT Types',
  'physical-training:types:attempts': 'PT Attempts',
  'physical-training:types:tasks': 'PT Tasks',
  platoons: 'Platoons',
  positions: 'Positions',
  punishments: 'Punishments',
  rbac: 'Roles & Permissions',
  'rbac:permissions': 'Permission Settings',
  'rbac:mappings': 'Role/Position Mappings',
  'rbac:field-rules': 'Field Rules',
  'rbac:roles': 'Roles',
  'site-settings': 'Site Settings',
  subjects: 'Subjects',
  users: 'Users',
  'training-camps': 'Training Camps',
  'dashboard:genmgmt:rbac': 'RBAC Management Page',
  'dashboard:help': 'Help Page',
};

function humanizeToken(token: string): string {
  return token
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(' ');
}

function resolveActionLabel(actionToken: string): { actionLabel: PermissionActionLabel; titlePrefix: string; isFallback: boolean } {
  const normalized = actionToken.toLowerCase();
  if (normalized === 'create') return { actionLabel: 'Create', titlePrefix: 'Can create', isFallback: false };
  if (normalized === 'read' || normalized === 'view') {
    return { actionLabel: 'View', titlePrefix: 'Can view', isFallback: false };
  }
  if (normalized === 'update' || normalized === 'edit') {
    return { actionLabel: 'Edit', titlePrefix: 'Can edit', isFallback: false };
  }
  if (normalized === 'delete') return { actionLabel: 'Delete', titlePrefix: 'Can delete', isFallback: false };
  if (normalized === 'upload') return { actionLabel: 'Upload', titlePrefix: 'Can upload', isFallback: false };
  if (normalized === 'download') return { actionLabel: 'Download', titlePrefix: 'Can download', isFallback: false };
  if (normalized === '*') return { actionLabel: 'Access', titlePrefix: 'Can access', isFallback: false };
  return { actionLabel: 'Manage', titlePrefix: 'Can manage', isFallback: true };
}

function resolveAreaLabel(areaToken: string): { areaLabel: string; isFallback: boolean } {
  const normalized = areaToken.toLowerCase();
  const mapped = AREA_LABELS[normalized];
  if (mapped) {
    return { areaLabel: mapped, isFallback: false };
  }
  return { areaLabel: humanizeToken(areaToken), isFallback: true };
}

function resolveModuleLabel(moduleTokens: string[]): { moduleLabel: string; isFallback: boolean } {
  if (moduleTokens.length === 0) {
    return { moduleLabel: 'General Access', isFallback: true };
  }

  for (let length = moduleTokens.length; length > 0; length -= 1) {
    const path = moduleTokens.slice(0, length).join(':').toLowerCase();
    const mapped = MODULE_LABELS[path];
    if (mapped) {
      return { moduleLabel: mapped, isFallback: false };
    }
  }

  return {
    moduleLabel: moduleTokens.map(humanizeToken).join(' / '),
    isFallback: true,
  };
}

function normalizeExistingDescription(description?: string | null): string | null {
  if (!description) return null;
  const trimmed = description.trim();
  if (!trimmed || trimmed === '-') return null;
  return trimmed;
}

export function getPermissionDisplayMeta(key: string, description?: string | null): PermissionDisplayMeta {
  const tokens = key.split(':').filter(Boolean);
  const areaToken = tokens[0] ?? 'general';
  const actionToken = tokens[tokens.length - 1] ?? 'access';
  const moduleTokens = tokens.slice(1, -1);

  const area = resolveAreaLabel(areaToken);
  const moduleMeta = resolveModuleLabel(moduleTokens);
  const action = resolveActionLabel(actionToken);

  const noun = moduleMeta.moduleLabel.toLowerCase();
  const title = `${action.titlePrefix} ${noun}`;
  const generatedDescription = `Allows user to ${action.titlePrefix.replace('Can ', '').toLowerCase()} ${noun} in ${area.areaLabel}.`;
  const finalDescription = normalizeExistingDescription(description) ?? generatedDescription;

  return {
    key,
    title,
    moduleLabel: moduleMeta.moduleLabel,
    areaLabel: area.areaLabel,
    description: finalDescription,
    actionLabel: action.actionLabel,
    isFallback: area.isFallback || moduleMeta.isFallback || action.isFallback,
  };
}
