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
    summary: 'Bootstrap order for roles, permissions, admin users, and baseline data.',
    route: '/dashboard/help',
    status: 'coming_soon',
    tags: ['seed', 'bootstrap'],
    sections: [],
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
