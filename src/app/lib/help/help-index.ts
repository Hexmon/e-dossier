import type { HelpCard, HelpModuleMeta, HelpSearchEntry } from '@/types/help';

export const HELP_MODULES: HelpModuleMeta[] = [
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
      { anchor: 'rbac-seeding-flow', label: '5. RBAC Seeding Flow', keywords: ['seed:rbac', 'seed:permissions'] },
      { anchor: 'admin-seed', label: '6. Admin Seed', keywords: ['seed:admins'] },
      { anchor: 'run-and-verify', label: '7. Run and Verify', keywords: ['dev', 'lint', 'typecheck', 'build'] },
      {
        anchor: 'common-failures',
        label: '8. Common Failures & Fixes',
        keywords: ['permission-matrix', 'pnpm', 'lockfile', 'audit'],
      },
    ],
  },
  {
    key: 'rbac-and-permissions',
    title: 'RBAC & Permissions',
    summary: 'How action-map, permission matrix, and role/position mapping work together.',
    route: '/dashboard/help',
    status: 'coming_soon',
    tags: ['rbac', 'permissions', 'action-map'],
    sections: [],
  },
  {
    key: 'seeding-and-bootstrap',
    title: 'Seeding & Data Bootstrap',
    summary: 'One-command and one-click bootstrap for baseline organization template setup.',
    route: '/dashboard/help/org-templates',
    status: 'active',
    tags: ['seed', 'bootstrap', 'org-template', 'pt'],
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
        keywords: ['template view', 'pt management'],
      },
      {
        anchor: 'deployment-order',
        label: '5. Deployment order',
        keywords: ['db:migrate', 'seed:rbac', 'seed:permissions', 'seed:admins'],
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
    ],
  },
  {
    key: 'deployment-and-environment',
    title: 'Deployment & Environment',
    summary: 'Deployment prerequisites, environment hardening, and operations checks.',
    route: '/dashboard/help',
    status: 'coming_soon',
    tags: ['deploy', 'ops', 'environment'],
    sections: [],
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
