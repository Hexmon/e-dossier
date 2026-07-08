import { API_ACTION_MAP } from '@/app/lib/acx/action-map';
import * as adminAppointmentTransfers from '@/app/db/schema/admin/appointmentTransfers';
import * as adminPunishments from '@/app/db/schema/admin/punishments';
import * as authAppointments from '@/app/db/schema/auth/appointments';
import * as authAudit from '@/app/db/schema/auth/audit';
import * as authAuditEvents from '@/app/db/schema/auth/audit-events';
import * as authCredentials from '@/app/db/schema/auth/credentials';
import * as authDelegations from '@/app/db/schema/auth/delegations';
import * as authDeviceSiteSettings from '@/app/db/schema/auth/deviceSiteSettings';
import * as authDossierLockSettings from '@/app/db/schema/auth/dossierLockSettings';
import * as authFunctionalRoleMappings from '@/app/db/schema/auth/functionalRoleMappings';
import * as authInterviewPendingTickerSettings from '@/app/db/schema/auth/interviewPendingTickerSettings';
import * as authLoginAttempts from '@/app/db/schema/auth/login_attempts';
import * as authModuleAccessSettings from '@/app/db/schema/auth/moduleAccessSettings';
import * as authOrgHierarchyNodes from '@/app/db/schema/auth/orgHierarchyNodes';
import * as authPlatoons from '@/app/db/schema/auth/platoons';
import * as authPositions from '@/app/db/schema/auth/positions';
import * as authRbac from '@/app/db/schema/auth/rbac';
import * as authRbacExtensions from '@/app/db/schema/auth/rbac-extensions';
import * as authSignupRequests from '@/app/db/schema/auth/signupRequests';
import * as authSiteSettings from '@/app/db/schema/auth/siteSettings';
import * as authSsbUploadVisibilitySettings from '@/app/db/schema/auth/ssbUploadVisibilitySettings';
import * as authUsers from '@/app/db/schema/auth/users';
import * as trainingAcademicGradingPolicy from '@/app/db/schema/training/academicGradingPolicy';
import * as trainingCadetAppointments from '@/app/db/schema/training/cadetAppointments';
import * as trainingCourseOfferings from '@/app/db/schema/training/courseOfferings';
import * as trainingCourses from '@/app/db/schema/training/courses';
import * as trainingDossierInspections from '@/app/db/schema/training/dossierInspections';
import * as trainingInstructors from '@/app/db/schema/training/instructors';
import * as trainingInterviewOc from '@/app/db/schema/training/interviewOc';
import * as trainingInterviewTemplates from '@/app/db/schema/training/interviewTemplates';
import * as trainingMarksReviewWorkflow from '@/app/db/schema/training/marksReviewWorkflow';
import * as trainingOc from '@/app/db/schema/training/oc';
import * as trainingOcRelegations from '@/app/db/schema/training/ocRelegations';
import * as trainingPhysicalTraining from '@/app/db/schema/training/physicalTraining';
import * as trainingPhysicalTrainingOc from '@/app/db/schema/training/physicalTrainingOc';
import * as trainingReportDownloadVersions from '@/app/db/schema/training/reportDownloadVersions';
import * as trainingSubjects from '@/app/db/schema/training/subjects';
import * as trainingWarningManagement from '@/app/db/schema/training/warningManagement';

type SchemaModule = Record<string, unknown>;

export type RbacFieldCatalogItem = {
  id: string;
  moduleLabel: string;
  areaLabel: string;
  tableName: string;
  tableExport: string;
  fieldKey: string;
  fieldName: string;
  fieldLabel: string;
  columnName: string;
  dataType: string;
  resourceType: string | null;
  readPermissionKey: string | null;
  writePermissionKeys: string[];
  technical: boolean;
};

const NAME_SYMBOL = Symbol.for('drizzle:Name');
const COLUMNS_SYMBOL = Symbol.for('drizzle:Columns');
const IS_TABLE_SYMBOL = Symbol.for('drizzle:IsDrizzleTable');

const TECHNICAL_FIELD_KEYS = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'deactivatedAt',
  'endedBy',
  'appointedBy',
]);

const SCHEMA_GROUPS: Array<{
  moduleLabel: string;
  areaLabel: string;
  schema: SchemaModule;
}> = [
  { moduleLabel: 'Administration', areaLabel: 'Users', schema: authUsers },
  { moduleLabel: 'Administration', areaLabel: 'Appointments', schema: authAppointments },
  { moduleLabel: 'Administration', areaLabel: 'Positions', schema: authPositions },
  { moduleLabel: 'Administration', areaLabel: 'Delegations', schema: authDelegations },
  { moduleLabel: 'Administration', areaLabel: 'RBAC', schema: authRbac },
  { moduleLabel: 'Administration', areaLabel: 'RBAC Field Rules', schema: authRbacExtensions },
  { moduleLabel: 'Administration', areaLabel: 'Module Access', schema: authModuleAccessSettings },
  { moduleLabel: 'Administration', areaLabel: 'Hierarchy', schema: authOrgHierarchyNodes },
  { moduleLabel: 'Administration', areaLabel: 'Functional Roles', schema: authFunctionalRoleMappings },
  { moduleLabel: 'Administration', areaLabel: 'Platoons', schema: authPlatoons },
  { moduleLabel: 'Administration', areaLabel: 'Credentials', schema: authCredentials },
  { moduleLabel: 'Administration', areaLabel: 'Signup Requests', schema: authSignupRequests },
  { moduleLabel: 'Administration', areaLabel: 'Audit', schema: authAudit },
  { moduleLabel: 'Administration', areaLabel: 'Audit Events', schema: authAuditEvents },
  { moduleLabel: 'Administration', areaLabel: 'Login Attempts', schema: authLoginAttempts },
  { moduleLabel: 'Administration', areaLabel: 'Device Settings', schema: authDeviceSiteSettings },
  { moduleLabel: 'Administration', areaLabel: 'Dossier Lock', schema: authDossierLockSettings },
  { moduleLabel: 'Administration', areaLabel: 'Site Settings', schema: authSiteSettings },
  { moduleLabel: 'Administration', areaLabel: 'SSB Upload Visibility', schema: authSsbUploadVisibilitySettings },
  { moduleLabel: 'Administration', areaLabel: 'Interview Ticker', schema: authInterviewPendingTickerSettings },
  { moduleLabel: 'Administration', areaLabel: 'Appointment Transfers', schema: adminAppointmentTransfers },
  { moduleLabel: 'Administration', areaLabel: 'Punishments', schema: adminPunishments },
  { moduleLabel: 'Training Setup', areaLabel: 'Courses', schema: trainingCourses },
  { moduleLabel: 'Training Setup', areaLabel: 'Course Offerings', schema: trainingCourseOfferings },
  { moduleLabel: 'Training Setup', areaLabel: 'Subjects', schema: trainingSubjects },
  { moduleLabel: 'Training Setup', areaLabel: 'Instructors', schema: trainingInstructors },
  { moduleLabel: 'Training Setup', areaLabel: 'Academic Grading Policy', schema: trainingAcademicGradingPolicy },
  { moduleLabel: 'Training Setup', areaLabel: 'Interview Templates', schema: trainingInterviewTemplates },
  { moduleLabel: 'Training Setup', areaLabel: 'Physical Training Templates', schema: trainingPhysicalTraining },
  { moduleLabel: 'Training Setup', areaLabel: 'Cadet Appointments', schema: trainingCadetAppointments },
  { moduleLabel: 'Training Setup', areaLabel: 'Marks Review Workflow', schema: trainingMarksReviewWorkflow },
  { moduleLabel: 'Training Setup', areaLabel: 'Reports', schema: trainingReportDownloadVersions },
  { moduleLabel: 'Training Setup', areaLabel: 'Warning Management', schema: trainingWarningManagement },
  { moduleLabel: 'Dossier', areaLabel: 'Officer Cadets', schema: trainingOc },
  { moduleLabel: 'Dossier', areaLabel: 'Dossier Inspections', schema: trainingDossierInspections },
  { moduleLabel: 'Dossier', areaLabel: 'Interviews', schema: trainingInterviewOc },
  { moduleLabel: 'Dossier', areaLabel: 'Physical Training Records', schema: trainingPhysicalTrainingOc },
  { moduleLabel: 'Dossier', areaLabel: 'Relegation', schema: trainingOcRelegations },
];

const RESOURCE_OVERRIDES: Record<string, string> = {
  users: 'admin:users',
  appointments: 'admin:appointments',
  positions: 'admin:positions',
  delegations: 'admin:delegations',
  roles: 'admin:rbac:roles',
  permissions: 'admin:rbac:permissions',
  role_permissions: 'admin:rbac:mappings',
  position_permissions: 'admin:rbac:mappings',
  permission_field_rules: 'admin:rbac:field-rules',
  module_access_settings: 'admin:module-access',
  org_hierarchy_nodes: 'admin:hierarchy:nodes',
  functional_role_mappings: 'admin:hierarchy:functional-role-mappings',
  platoons: 'platoons',
  signup_requests: 'admin:signup-requests',
  device_site_settings: 'admin:device-site-settings',
  dossier_lock_settings: 'admin:dossier-lock',
  site_settings: 'admin:site-settings',
  site_settings_history: 'admin:site-settings:history',
  ssb_upload_visibility_settings: 'admin:ssb-upload:settings',
  courses: 'admin:courses',
  course_offerings: 'admin:courses:offerings',
  subjects: 'admin:subjects',
  instructors: 'admin:instructors',
  academic_grading_policy: 'admin:academics:grading-policy',
  interview_templates: 'admin:interview:templates',
  physical_training_types: 'admin:physical-training:types',
  physical_training_tasks: 'admin:physical-training:types:tasks',
  physical_training_scores: 'admin:physical-training:types:tasks:scores',
  training_camps: 'admin:training-camps',
  training_camp_activities: 'admin:training-camps:activities',
  training_camp_settings: 'admin:training-camps:settings',
  report_download_versions: 'reports:metadata:course-semesters',
  marks_review_workflow_settings: 'admin:marks-review-workflow',
  warning_restriction_settings: 'admin:warning-management',
  oc_cadets: 'oc',
  oc_course_enrollments: 'oc',
  oc_personal: 'oc:personal',
  oc_family_members: 'oc:family',
  oc_education: 'oc:education',
  oc_achievements: 'oc:achievements',
  oc_autobiography: 'oc:autobiography',
  oc_ssb_reports: 'oc:ssb',
  oc_ssb_points: 'oc:ssb:points',
  oc_medicals: 'oc:medical',
  oc_medical_category: 'oc:medical-category',
  oc_discipline: 'oc:discipline',
  oc_parent_comms: 'oc:parent-comms',
  oc_academics: 'oc:academics',
  oc_semester_marks: 'oc:academics',
  oc_physical_training: 'oc:physical-training',
  oc_sports_and_games: 'oc:sports-and-games',
  oc_weapon_training: 'oc:weapon-training',
  oc_obstacle_training: 'oc:obstacle-training',
  oc_speed_march: 'oc:speed-march',
  oc_camps: 'oc:camps',
  oc_camp_reviews: 'oc:camps',
  oc_camp_activity_scores: 'oc:camps',
  oc_clubs: 'oc:clubs',
  oc_drill: 'oc:drill',
  oc_special_achievement_in_clubs: 'oc:club-achievements',
  oc_special_achievement_in_firing: 'oc:special-achievement-in-firing',
  oc_credit_for_excellence: 'oc:credit-for-excellence',
  oc_olq: 'oc:olq',
  oc_olq_category: 'oc:olq:categories',
  oc_olq_subtitle: 'oc:olq:subtitles',
  oc_olq_score: 'oc:olq',
  oc_recording_leave_hike_detention: 'oc:recording-leave-hike-detention',
  oc_counselling: 'oc:counselling',
  oc_motivation_awards: 'oc:motivation-awards',
  oc_spr_records: 'oc:spr',
  oc_dossier_filling: 'oc:dossier-filling',
  oc_dossier_inspections: 'oc:dossier-inspection',
  oc_images: 'oc:images',
  oc_relegations: 'admin:relegation:enrollments',
};

const ACTIONS_BY_RESOURCE = API_ACTION_MAP.reduce((map, entry) => {
  const actions = map.get(entry.resourceType) ?? new Set<string>();
  actions.add(entry.action);
  map.set(entry.resourceType, actions);
  return map;
}, new Map<string, Set<string>>());

function isDrizzleTable(value: unknown): value is Record<PropertyKey, unknown> {
  return Boolean(value && typeof value === 'object' && (value as any)[IS_TABLE_SYMBOL]);
}

function tableName(table: Record<PropertyKey, unknown>): string {
  return String(table[NAME_SYMBOL] ?? '');
}

function tableColumns(table: Record<PropertyKey, unknown>): Record<string, any> {
  return (table[COLUMNS_SYMBOL] ?? {}) as Record<string, any>;
}

function humanize(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function inferResourceType(table: string): string | null {
  if (RESOURCE_OVERRIDES[table]) return RESOURCE_OVERRIDES[table];
  if (!table.startsWith('oc_')) return null;

  const candidate = `oc:${table.slice(3).replace(/_/g, '-')}`;
  if (ACTIONS_BY_RESOURCE.has(candidate)) return candidate;
  return null;
}

function firstAction(resourceType: string | null, suffixes: string[]): string | null {
  if (!resourceType) return null;
  const actions = ACTIONS_BY_RESOURCE.get(resourceType);
  if (!actions) return null;
  for (const suffix of suffixes) {
    const match = Array.from(actions).find((action) => action.endsWith(suffix));
    if (match) return match;
  }
  return null;
}

function writeActions(resourceType: string | null): string[] {
  if (!resourceType) return [];
  const actions = ACTIONS_BY_RESOURCE.get(resourceType);
  if (!actions) return [];
  return Array.from(actions)
    .filter((action) => action.endsWith(':create') || action.endsWith(':update'))
    .sort();
}

function buildCatalog(): RbacFieldCatalogItem[] {
  const seen = new Set<string>();
  const items: RbacFieldCatalogItem[] = [];

  for (const group of SCHEMA_GROUPS) {
    for (const [tableExport, table] of Object.entries(group.schema)) {
      if (!isDrizzleTable(table)) continue;
      const dbTableName = tableName(table);
      if (!dbTableName) continue;

      const resourceType = inferResourceType(dbTableName);
      const readPermissionKey = firstAction(resourceType, [':read']);
      const writePermissionKeys = writeActions(resourceType);

      for (const [fieldKey, column] of Object.entries(tableColumns(table))) {
        const id = `${dbTableName}.${fieldKey}`;
        if (seen.has(id)) continue;
        seen.add(id);

        items.push({
          id,
          moduleLabel: group.moduleLabel,
          areaLabel: group.areaLabel,
          tableName: dbTableName,
          tableExport,
          fieldKey,
          fieldName: fieldKey,
          fieldLabel: humanize(fieldKey),
          columnName: String(column?.name ?? fieldKey),
          dataType: String(column?.dataType ?? column?.columnType ?? 'unknown'),
          resourceType,
          readPermissionKey,
          writePermissionKeys,
          technical: TECHNICAL_FIELD_KEYS.has(fieldKey) || fieldKey.endsWith('Id'),
        });
      }
    }
  }

  return items.sort((a, b) =>
    [a.moduleLabel, a.areaLabel, a.tableName, a.fieldLabel].join('|')
      .localeCompare([b.moduleLabel, b.areaLabel, b.tableName, b.fieldLabel].join('|'))
  );
}

const FIELD_CATALOG = buildCatalog();

export function listRbacFieldCatalog(): RbacFieldCatalogItem[] {
  return FIELD_CATALOG;
}

export function findRbacFieldCatalogItems(fieldIds: string[]): RbacFieldCatalogItem[] {
  const byId = new Map(FIELD_CATALOG.map((item) => [item.id, item]));
  return Array.from(new Set(fieldIds)).map((id) => byId.get(id)).filter((item): item is RbacFieldCatalogItem => Boolean(item));
}
