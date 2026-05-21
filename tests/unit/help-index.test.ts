import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { HELP_MODULES, buildHelpSearchEntries, getHelpCards } from '@/app/lib/help/help-index';
import { PAGE_ACTION_MAP } from '@/app/lib/acx/action-map';

const ROUTE_TO_DOC: Record<string, string> = {
  '/dashboard/help/admin-operations': 'admin-operations.md',
  '/dashboard/help/bulk-upload': 'bulk-upload.md',
  '/dashboard/help/deployment-environment': 'deployment-environment.md',
  '/dashboard/help/dossier-management': 'dossier-management.md',
  '/dashboard/help/general-management': 'general-management.md',
  '/dashboard/help/module-management': 'module-management.md',
  '/dashboard/help/org-templates': 'org-templates.md',
  '/dashboard/help/org-templates/grading-policy': 'grading-policy.md',
  '/dashboard/help/org-templates/olq': 'olq-template.md',
  '/dashboard/help/org-templates/physical-training': 'physical-training-template.md',
  '/dashboard/help/rbac-permissions': 'rbac-permissions.md',
  '/dashboard/help/reports': 'reports.md',
  '/dashboard/help/settings-controls': 'settings-controls.md',
  '/dashboard/help/setup-guide': 'setup-guide.md',
  '/dashboard/help/software-overview': 'software-overview.md',
};

function pagePathForRoute(route: string) {
  return path.join(process.cwd(), 'src/app', route, 'page.tsx');
}

function docPathForRoute(route: string) {
  const docName = ROUTE_TO_DOC[route];
  if (!docName) return null;
  return path.join(process.cwd(), 'docs/help', docName);
}

function collectAnchors(markdown: string) {
  return new Set(Array.from(markdown.matchAll(/\{#([a-zA-Z0-9_-]+)\}/g)).map((match) => match[1]));
}

describe('help index', () => {
  it('keeps help keys and routes unique', () => {
    const keys = HELP_MODULES.map((entry) => entry.key);
    const routes = HELP_MODULES.map((entry) => entry.route);

    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('points every active help card at a real page and markdown document', () => {
    const cards = getHelpCards().filter((card) => card.status === 'active');

    expect(cards.length).toBeGreaterThan(10);
    for (const card of cards) {
      expect(fs.existsSync(pagePathForRoute(card.route)), card.route).toBe(true);
      const docPath = docPathForRoute(card.route);
      expect(docPath, card.route).toBeTruthy();
      expect(fs.existsSync(docPath!), card.route).toBe(true);
    }
  });

  it('keeps indexed section anchors in sync with markdown headings', () => {
    for (const helpModule of HELP_MODULES.filter((entry) => entry.status === 'active')) {
      const docPath = docPathForRoute(helpModule.route);
      expect(docPath, helpModule.route).toBeTruthy();
      const anchors = collectAnchors(fs.readFileSync(docPath!, 'utf8'));

      for (const section of helpModule.sections) {
        expect(anchors.has(section.anchor), `${helpModule.key}:${section.anchor}`).toBe(true);
      }
    }
  });

  it('indexes every card and section in help search', () => {
    const entries = buildHelpSearchEntries();
    const ids = new Set(entries.map((entry) => entry.id));

    for (const helpModule of HELP_MODULES) {
      expect(ids.has(`card:${helpModule.key}`)).toBe(true);
      for (const section of helpModule.sections) {
        expect(ids.has(`section:${helpModule.key}:${section.anchor}`)).toBe(true);
      }
    }
  });

  it('keeps active help pages represented in the page action map', () => {
    const pageRoutes = new Set(PAGE_ACTION_MAP.map((entry) => entry.route));

    for (const helpModule of HELP_MODULES.filter((entry) => entry.status === 'active')) {
      expect(pageRoutes.has(helpModule.route), helpModule.route).toBe(true);
    }
  });
});
