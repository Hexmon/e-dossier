import type { HelpCard, HelpModuleMeta, HelpSearchEntry } from '@/types/help';

export const HELP_MODULES: HelpModuleMeta[] = [
  {
    key: 'software-overview',
    title: 'Software Overview',
    summary: 'How dashboard navigation, setup gate, OC lifecycle, module access, and the manual fit together.',
    route: '/dashboard/help/software-overview',
    status: 'active',
    tags: ['overview', 'dashboard', 'navigation', 'setup', 'oc lifecycle', 'module access'],
    sections: [
      { anchor: 'dashboard-structure', label: '1. Dashboard Structure', keywords: ['dashboard', 'sidebar'] },
      { anchor: 'role-based-navigation', label: '2. Role-Based Navigation', keywords: ['navigation', 'role'] },
      { anchor: 'initial-setup-gate', label: '3. Initial Setup Gate', keywords: ['setup', 'locked'] },
      { anchor: 'oc-lifecycle-overview', label: '4. OC Lifecycle Overview', keywords: ['oc', 'enrollment'] },
      { anchor: 'module-access-overview', label: '5. Module Access Overview', keywords: ['module access'] },
      { anchor: 'using-this-manual', label: '6. Using This Manual', keywords: ['manual', 'search'] },
      {
        anchor: 'detailed-operating-model',
        label: '7. Detailed Operating Model',
        keywords: ['source of truth', 'qa evidence', 'page protection'],
      },
    ],
  },
  {
    key: 'setup-guide',
    title: 'Setup Guide',
    summary:
      'Complete first-time environment setup for app, database, MinIO, migrations, RBAC seeding, and verification.',
    route: '/dashboard/help/setup-guide',
    status: 'active',
    tags: ['setup', 'install', 'database', 'minio', 'seed', 'rbac'],
    sections: [
      { anchor: 'prerequisites', label: '1. Prerequisites', keywords: ['node', 'pnpm', 'postgres', 'docker'] },
      { anchor: 'environment-files', label: '2. Environment Files', keywords: ['env', 'database_url'] },
      {
        anchor: 'start-data-services',
        label: '3. Start Data Services (Postgres + MinIO)',
        keywords: ['docker compose', 'minio', 'postgres'],
      },
      { anchor: 'database-migration', label: '4. Database Migration', keywords: ['drizzle', 'migrate'] },
      { anchor: 'first-run-ui-setup', label: '5. First-Run UI Setup', keywords: ['setup page', 'super admin'] },
      { anchor: 'rbac-seeding-flow', label: '6. RBAC Seeding Flow', keywords: ['seed:rbac', 'seed:permissions'] },
      { anchor: 'admin-seed', label: '7. Admin Seed', keywords: ['seed:admins'] },
      { anchor: 'run-and-verify', label: '8. Run and Verify', keywords: ['dev', 'lint', 'typecheck', 'build'] },
      {
        anchor: 'common-failures',
        label: '9. Common Failures & Fixes',
        keywords: ['permission-matrix', 'pnpm', 'lockfile', 'audit'],
      },
      {
        anchor: 'full-setup-acceptance-criteria',
        label: '10. Full Setup Acceptance Criteria',
        keywords: ['acceptance', 'infrastructure', 'functional'],
      },
    ],
  },
  {
    key: 'admin-operations',
    title: 'Admin Operations',
    summary:
      'Operational manual for User, Approval, Appointment, Platoon management, and report PDF verification.',
    route: '/dashboard/help/admin-operations',
    status: 'active',
    tags: ['admin', 'users', 'approval', 'appointments', 'platoon', 'report verification'],
    sections: [
      {
        anchor: 'user-management',
        label: '1. User Management',
        keywords: ['usersmgmt', 'username', 'rank'],
      },
      {
        anchor: 'approval-management',
        label: '2. Approval Management',
        keywords: ['approval', 'scope', 'position'],
      },
      {
        anchor: 'appointment-management',
        label: '3. Appointment Management',
        keywords: ['handover', 'history', 'appointments'],
      },
      {
        anchor: 'platoon-management',
        label: '4. Platoon Management',
        keywords: ['platoon', 'commander'],
      },
      {
        anchor: 'verify-downloaded-report-pdf',
        label: '5. Verify Downloaded Report PDF',
        keywords: ['version code', 'checksum', 'authentic'],
      },
      {
        anchor: 'detailed-admin-operations-checklist',
        label: '6. Detailed Admin Operations Checklist',
        keywords: ['user lifecycle', 'handover', 'smoke checklist'],
      },
    ],
  },
  {
    key: 'general-management',
    title: 'General Management',
    summary: 'Operational guide for courses, OCs, users, appointments, hierarchy, platoons, and promotion/relegation.',
    route: '/dashboard/help/general-management',
    status: 'active',
    tags: ['general management', 'courses', 'oc', 'users', 'appointments', 'hierarchy', 'platoon'],
    sections: [
      { anchor: 'course-management', label: '1. Course Management', keywords: ['course', 'pagination'] },
      { anchor: 'subject-offering-management', label: '2. Subject And Offering Management', keywords: ['subject', 'offering'] },
      { anchor: 'oc-management', label: '3. OC Management', keywords: ['oc', 'cadet', 'excel'] },
      { anchor: 'user-approval-management', label: '4. User And Approval Management', keywords: ['user', 'approval'] },
      { anchor: 'appointment-management', label: '5. Appointment Management', keywords: ['appointment', 'handover'] },
      { anchor: 'hierarchy-management', label: '6. Hierarchy Management', keywords: ['hierarchy', 'tree'] },
      { anchor: 'instructor-platoon-management', label: '7. Instructor And Platoon Management', keywords: ['instructor', 'platoon'] },
      { anchor: 'promotion-relegation', label: '8. Promotion And Relegation', keywords: ['promotion', 'relegation'] },
      { anchor: 'report-verification', label: '9. Report Verification', keywords: ['version code', 'pdf'] },
      {
        anchor: 'detailed-general-management-reference',
        label: '10. Detailed General Management Reference',
        keywords: ['setup order', 'bulk edit', 'qa matrix'],
      },
    ],
  },
  {
    key: 'module-management',
    title: 'Module Management',
    summary: 'Guide for academics, grading, camps, punishments, interviews, PT, OLQ, defaults, and workflow settings.',
    route: '/dashboard/help/module-management',
    status: 'active',
    tags: ['module management', 'academics', 'pt', 'olq', 'interviews', 'workflow'],
    sections: [
      { anchor: 'academics-management', label: '1. Academics Management', keywords: ['academics', 'marks'] },
      { anchor: 'grading-policy', label: '2. Grading Policy', keywords: ['grading', 'gpa'] },
      { anchor: 'camps-management', label: '3. Camps Management', keywords: ['camp', 'activities'] },
      { anchor: 'punishment-management', label: '4. Punishment Management', keywords: ['punishment', 'discipline'] },
      { anchor: 'interview-management', label: '5. Interview Management', keywords: ['interview', 'templates'] },
      { anchor: 'physical-training-management', label: '6. Physical Training Management', keywords: ['pt', 'score matrix'] },
      { anchor: 'olq-management', label: '7. OLQ Management', keywords: ['olq', 'categories'] },
      { anchor: 'default-templates', label: '8. Default Templates', keywords: ['template', 'default'] },
      { anchor: 'workflow-settings', label: '9. Workflow Settings', keywords: ['workflow', 'review'] },
      {
        anchor: 'detailed-module-configuration-reference',
        label: '10. Detailed Module Configuration Reference',
        keywords: ['dependency map', 'qa matrix', 'configuration'],
      },
    ],
  },
  {
    key: 'dossier-management',
    title: 'Dossier Management',
    summary: 'OC-specific guide for dossier profile, training, academics, assessment, and performance pages.',
    route: '/dashboard/help/dossier-management',
    status: 'active',
    tags: ['dossier', 'oc details', 'military training', 'academics', 'assessment'],
    sections: [
      { anchor: 'dossier-entry-oc-context', label: '1. Dossier Entry And OC Context', keywords: ['oc selector', 'scope'] },
      { anchor: 'snapshot-filling-inspection', label: '2. Snapshot Filling And Inspection', keywords: ['snapshot', 'inspection'] },
      { anchor: 'personal-background-ssb', label: '3. Personal Background And SSB', keywords: ['personal', 'ssb'] },
      {
        anchor: 'medical-discipline-parent-communication',
        label: '4. Medical Discipline And Parent Communication',
        keywords: ['medical', 'discipline', 'parent'],
      },
      { anchor: 'academics-semester-records', label: '5. Academics And Semester Records', keywords: ['semester'] },
      { anchor: 'physical-military-training', label: '6. Physical And Military Training', keywords: ['pt', 'weapon'] },
      { anchor: 'sports-camps-clubs-drill', label: '7. Sports Camps Clubs And Drill', keywords: ['sports', 'camps'] },
      {
        anchor: 'leave-hike-detention-counselling',
        label: '8. Leave Hike Detention And Counselling',
        keywords: ['leave', 'hike', 'detention'],
      },
      { anchor: 'olq-interviews-cfe-overall', label: '9. OLQ Interviews CFE And Overall Assessment', keywords: ['olq', 'cfe'] },
      {
        anchor: 'detailed-dossier-page-reference',
        label: '10. Detailed Dossier Page Reference',
        keywords: ['page matrix', 'edit policy', 'semester handling'],
      },
    ],
  },
  {
    key: 'bulk-upload',
    title: 'Bulk Upload',
    summary: 'OC upload, academic marks bulk, PT bulk, dry-run preview, refresh, and workflow approval guide.',
    route: '/dashboard/help/bulk-upload',
    status: 'active',
    tags: ['bulk upload', 'excel', 'oc upload', 'marks', 'pt bulk'],
    sections: [
      { anchor: 'bulk-upload-hub', label: '1. Bulk Upload Hub', keywords: ['hub', 'access'] },
      { anchor: 'oc-bulk-upload', label: '2. OC Bulk Upload', keywords: ['oc', 'excel'] },
      { anchor: 'academic-marks-bulk-upload', label: '3. Academic Marks Bulk Upload', keywords: ['academics'] },
      { anchor: 'pt-bulk-upload', label: '4. PT Bulk Upload', keywords: ['pt'] },
      { anchor: 'dry-run-preview-refresh', label: '5. Dry Run Preview And Refresh', keywords: ['dry run', 'refresh'] },
      { anchor: 'workflow-approval', label: '6. Workflow Approval', keywords: ['workflow', 'review'] },
      { anchor: 'common-validation-failures', label: '7. Common Validation Failures', keywords: ['validation', 'errors'] },
      {
        anchor: 'detailed-bulk-upload-reference',
        label: '8. Detailed Bulk Upload Reference',
        keywords: ['field ownership', 'preview checklist', 'operator mistakes'],
      },
    ],
  },
  {
    key: 'reports',
    title: 'Reports',
    summary: 'Report hub, academic reports, PT assessment, course performance, download, and verification guide.',
    route: '/dashboard/help/reports',
    status: 'active',
    tags: ['reports', 'pdf', 'version code', 'download', 'verification'],
    sections: [
      { anchor: 'reports-hub', label: '1. Reports Hub', keywords: ['report hub'] },
      { anchor: 'academic-reports', label: '2. Academic Reports', keywords: ['academic', 'grade'] },
      { anchor: 'physical-assessment-report', label: '3. Physical Assessment Report', keywords: ['pt assessment'] },
      { anchor: 'course-performance-reports', label: '4. Course Performance Reports', keywords: ['course performance'] },
      { anchor: 'download-password-version-code', label: '5. Download Password And Version Code', keywords: ['password'] },
      { anchor: 'report-verification', label: '6. Report Verification', keywords: ['verification'] },
      {
        anchor: 'detailed-reports-reference',
        label: '7. Detailed Reports Reference',
        keywords: ['source map', 'generation flow', 'filters'],
      },
    ],
  },
  {
    key: 'settings-controls',
    title: 'Settings Controls',
    summary: 'Device/site settings, module access, workflow settings, dossier lock, ticker, and public content.',
    route: '/dashboard/help/settings-controls',
    status: 'active',
    tags: ['settings', 'module access', 'dossier lock', 'ticker', 'site settings'],
    sections: [
      { anchor: 'device-site-settings', label: '1. Device Site Settings', keywords: ['device', 'site'] },
      { anchor: 'module-access-settings', label: '2. Module Access Settings', keywords: ['module access'] },
      { anchor: 'marks-review-workflow', label: '3. Marks Review Workflow', keywords: ['workflow'] },
      { anchor: 'dossier-lock-settings', label: '4. Dossier Lock Settings', keywords: ['lock'] },
      { anchor: 'ticker-notifications', label: '5. Ticker And Notifications', keywords: ['ticker', 'notification'] },
      { anchor: 'public-site-content-settings', label: '6. Public Site Content Settings', keywords: ['public site'] },
      {
        anchor: 'detailed-settings-reference',
        label: '7. Detailed Settings Reference',
        keywords: ['impact map', 'module access verification', 'dossier lock'],
      },
    ],
  },
  {
    key: 'rbac-permissions',
    title: 'RBAC & Permissions',
    summary: 'Action-map, permission matrix, roles, positions, appointment scope, field rules, and setup restrictions.',
    route: '/dashboard/help/rbac-permissions',
    status: 'active',
    tags: ['rbac', 'permissions', 'action-map', 'roles', 'positions', 'setup gate'],
    sections: [
      { anchor: 'action-map-permission-matrix', label: '1. Action Map And Permission Matrix', keywords: ['action-map'] },
      { anchor: 'roles-positions-appointments', label: '2. Roles Positions And Appointments', keywords: ['roles'] },
      { anchor: 'appointment-scope', label: '3. Appointment Scope', keywords: ['scope', 'platoon'] },
      { anchor: 'field-rules', label: '4. Field Rules', keywords: ['field rules'] },
      { anchor: 'module-access', label: '5. Module Access', keywords: ['module access'] },
      { anchor: 'setup-restrictions', label: '6. Setup Restrictions', keywords: ['setup'] },
      { anchor: 'verification-commands', label: '7. Verification Commands', keywords: ['validate'] },
      {
        anchor: 'detailed-access-control-reference',
        label: '8. Detailed Access Control Reference',
        keywords: ['access layers', 'permission change', 'setup gate'],
      },
    ],
  },
  {
    key: 'seeding-and-bootstrap',
    title: 'Seeding & Data Bootstrap',
    summary: 'One-command and one-click bootstrap for baseline organization template setup.',
    route: '/dashboard/help/org-templates',
    status: 'active',
    tags: ['seed', 'bootstrap', 'org-template', 'pt', 'camp', 'olq', 'appointment', 'platoon'],
    sections: [
      {
        anchor: 'what-this-does',
        label: '1. What this does',
        keywords: ['upsert', 'non-destructive', 'baseline'],
      },
      {
        anchor: 'one-command-setup',
        label: '2. One-command setup',
        keywords: ['seed:org-template', 'cli'],
      },
      {
        anchor: 'one-click-ui-setup',
        label: '3. One-click UI setup',
        keywords: [
          'template view',
          'pt management',
          'camp management',
          'olq management',
          'appointment management',
          'platoon management',
        ],
      },
      {
        anchor: 'platoon-default-template',
        label: '3.1 Platoon default template',
        keywords: ['platoon', 'arjun', 'chandragupt', 'ranapratap', 'shivaji', 'karna', 'prithviraj'],
      },
      {
        anchor: 'appointment-default-template',
        label: '3.2 Appointment default template',
        keywords: ['appointment', 'comdt', 'dcci', 'hoat', 'cdr', 'cco', 'ds_coord', 'ptn_cdr'],
      },
      {
        anchor: 'deployment-order',
        label: '5. Deployment order',
        keywords: ['db:migrate', 'seed:rbac', 'seed:permissions', 'seed:admins'],
      },
      {
        anchor: 'detailed-template-behavior-matrix',
        label: '7. Detailed Template Behavior Matrix',
        keywords: ['template ownership', 'dependency order', 'template drift'],
      },
    ],
  },
  {
    key: 'pt-template-profile',
    title: 'Physical Training Template',
    summary: 'Default PT profile structure, upsert keys, and post-apply validation checklist.',
    route: '/dashboard/help/org-templates/physical-training',
    status: 'active',
    tags: ['pt', 'template', 'score-matrix', 'motivation-awards'],
    sections: [
      {
        anchor: 'scope',
        label: '1. Scope',
        keywords: ['semesters', 'pt types', 'attempts', 'grades'],
      },
      {
        anchor: 'default-profile',
        label: '2. Default profile model',
        keywords: ['default.v1.json', 'upsert keys'],
      },
      {
        anchor: 'apply-behavior',
        label: '3. Apply behavior',
        keywords: ['no delete', 'create missing', 'update canonical'],
      },
      {
        anchor: 'validation-checklist',
        label: '4. Validation checklist',
        keywords: ['template view', 'motivation fields'],
      },
      {
        anchor: 'common-mistakes',
        label: '5. Common operator mistakes',
        keywords: ['production', 'manual edits', 'config only'],
      },
      {
        anchor: 'detailed-pt-template-reference',
        label: '6. Detailed PT Template Reference',
        keywords: ['score matrix', 'template view', 'qa matrix'],
      },
    ],
  },
  {
    key: 'olq-template-profile',
    title: 'OLQ Template',
    summary: 'Default OLQ categories/subtitles, apply scope options, and rollout checklist.',
    route: '/dashboard/help/org-templates/olq',
    status: 'active',
    tags: ['olq', 'template', 'course', 'replace', 'upsert-missing'],
    sections: [
      {
        anchor: 'scope',
        label: '1. Scope',
        keywords: ['categories', 'subtitles', 'all courses', 'selected course'],
      },
      {
        anchor: 'default-template',
        label: '2. Default template model',
        keywords: ['PLG & ORG', 'Social Adjustment', 'Social Effectiveness', 'Dynamic'],
      },
      {
        anchor: 'apply-options',
        label: '3. Apply options',
        keywords: ['dry run', 'replace', 'upsert_missing'],
      },
      {
        anchor: 'validation-checklist',
        label: '4. Validation checklist',
        keywords: ['olq management', 'course', 'term'],
      },
      {
        anchor: 'common-mistakes',
        label: '5. Common mistakes',
        keywords: ['replace', 'dry run', 'semester-specific'],
      },
      {
        anchor: 'detailed-olq-template-reference',
        label: '6. Detailed OLQ Template Reference',
        keywords: ['categories', 'replace', 'upsert_missing', 'qa matrix'],
      },
    ],
  },
  {
    key: 'academic-grading-policy',
    title: 'Academic Grading Policy',
    summary: 'Global letter-grade and grade-point policy, GPA formula settings, and recalculation workflow.',
    route: '/dashboard/help/org-templates/grading-policy',
    status: 'active',
    tags: ['grading', 'grade bands', 'sgpa', 'cgpa', 'academics', 'recalculate'],
    sections: [
      {
        anchor: 'what-this-controls',
        label: '1. What this controls',
        keywords: ['global policy', 'letter grades', 'grade points'],
      },
      {
        anchor: 'default-policy',
        label: '2. Default policy (C# mapping)',
        keywords: ['ap', 'ao', 'am', 'bp', 'bo', 'bm', 'cp', 'co', 'cm', 'f'],
      },
      {
        anchor: 'update-policy',
        label: '3. How to update policy',
        keywords: ['save policy', 'threshold'],
      },
      {
        anchor: 'recalculation-flow',
        label: '4. Recalculation flow (Preview and Apply)',
        keywords: ['dry run', 'apply updates', 'all courses', 'selected courses'],
      },
      {
        anchor: 'report-impact',
        label: '5. Report impact',
        keywords: ['consolidated', 'semester grade', 'final result compilation'],
      },
      {
        anchor: 'validation-checklist',
        label: '6. Validation checklist',
        keywords: ['verify', 'boundaries'],
      },
      {
        anchor: 'common-mistakes',
        label: '7. Common mistakes',
        keywords: ['mistakes', 'troubleshooting'],
      },
      {
        anchor: 'detailed-grading-policy-reference',
        label: '8. Detailed Grading Policy Reference',
        keywords: ['boundary testing', 'recalculation', 'report impact'],
      },
    ],
  },
  {
    key: 'deployment-and-environment',
    title: 'Deployment & Environment',
    summary: 'Environment files, Docker services, migrations, MinIO, security scans, hardening, and validation checks.',
    route: '/dashboard/help/deployment-environment',
    status: 'active',
    tags: ['deploy', 'ops', 'environment', 'docker', 'migrations', 'security'],
    sections: [
      { anchor: 'environment-files', label: '1. Environment Files', keywords: ['env', 'secrets'] },
      { anchor: 'docker-services', label: '2. Docker Services', keywords: ['docker', 'postgres', 'minio'] },
      { anchor: 'database-migrations', label: '3. Database Migrations', keywords: ['drizzle', 'migrate'] },
      { anchor: 'minio-and-storage', label: '4. MinIO And Storage', keywords: ['storage', 's3'] },
      { anchor: 'security-scan-commands', label: '5. Security Scan Commands', keywords: ['security', 'audit'] },
      { anchor: 'production-environment-hardening', label: '6. Production Environment Hardening', keywords: ['production'] },
      { anchor: 'validation-and-release-checks', label: '7. Validation And Release Checks', keywords: ['build', 'test'] },
      {
        anchor: 'detailed-deployment-runbook',
        label: '8. Detailed Deployment Runbook',
        keywords: ['local development', 'staging', 'production migration'],
      },
    ],
  },
];

export function getHelpCards(): HelpCard[] {
  return HELP_MODULES.map((helpModule) => ({
    key: helpModule.key,
    title: helpModule.title,
    summary: helpModule.summary,
    route: helpModule.route,
    status: helpModule.status,
    tags: helpModule.tags,
  }));
}

export function buildHelpSearchEntries(): HelpSearchEntry[] {
  const entries: HelpSearchEntry[] = [];

  for (const helpModule of HELP_MODULES) {
    entries.push({
      id: `card:${helpModule.key}`,
      type: 'card',
      title: helpModule.title,
      subtitle: helpModule.summary,
      href: helpModule.route,
      keywords: [...(helpModule.tags ?? []), helpModule.title, helpModule.summary],
    });

    for (const section of helpModule.sections) {
      entries.push({
        id: `section:${helpModule.key}:${section.anchor}`,
        type: 'section',
        title: section.label,
        subtitle: helpModule.title,
        href: `${helpModule.route}#${section.anchor}`,
        keywords: [...(helpModule.tags ?? []), ...(section.keywords ?? []), section.label, helpModule.title],
      });
    }
  }

  return entries;
}
