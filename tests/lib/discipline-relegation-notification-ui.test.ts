import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('warning notifications page actions', () => {
  it('does not expose discipline relegation actions from warning notifications', () => {
    const source = readFileSync('src/app/dashboard/notifications/page.tsx', 'utf8');

    expect(source).not.toContain('View relegation');
    expect(source).not.toContain('handleViewRelegation');
    expect(source).not.toContain('RelegationForm');
    expect(source).not.toContain('discipline-relegation-action');
    expect(source).not.toContain('Mark for discipline-ground relegation');
  });

  it('keeps existing notification actions available', () => {
    const source = readFileSync('src/app/dashboard/notifications/page.tsx', 'utf8');

    expect(source).toContain('MARK_AS_READ');
    expect(source).toContain('MARK_ALL_AS_READ');
    expect(source).toContain('View OC');
    expect(source).toContain('item.deepLink');
  });

  it('separates discipline and medical notifications into page tabs', () => {
    const source = readFileSync('src/app/dashboard/notifications/page.tsx', 'utf8');

    expect(source).toContain('TabsTrigger');
    expect(source).toContain('Discipline');
    expect(source).toContain('Medical');
    expect(source).toContain('useState<WarningModule>("DISCIPLINE")');
    expect(source).toContain('notifications.filter((item) => item.module === selectedModule)');
    expect(source).toContain('No discipline warning notifications.');
    expect(source).toContain('No medical warning notifications.');
  });

  it('separates discipline and medical notifications into bell dropdown tabs', () => {
    const source = readFileSync('src/components/Dashboard/WarningNotificationBell.tsx', 'utf8');

    expect(source).toContain('TabsTrigger');
    expect(source).toContain('Discipline');
    expect(source).toContain('Medical');
    expect(source).toContain('useState<WarningModule>("DISCIPLINE")');
    expect(source).toContain('notifications.filter((item) => item.module === selectedModule)');
    expect(source).toContain('No discipline warning notifications.');
    expect(source).toContain('No medical warning notifications.');
  });
});
