import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildWarningCriteriaForActiveAppointments,
  canViewWarningCriterion,
  DEFAULT_WARNING_CRITERIA,
  mergeWarningCriteria,
  normalizePositionKey,
  warningPolicyKeyForCriterion,
  warningAppointmentPositionKey,
} from '@/app/lib/warning-management';

describe('warning management defaults', () => {
  it('keeps the discipline warning thresholds from the governing note', () => {
    expect(DEFAULT_WARNING_CRITERIA.map((item) => [item.positionName, item.triggerType, item.restrictionPoints]))
      .toEqual([
        ['PL Cdr', 'SINGLE_TERM', 10],
        ['DS Coord / Dy Cdr', 'SINGLE_TERM', 20],
        ['Cdr, CTW', 'SINGLE_TERM', 25],
        ['DC & CI, MCEME', 'SINGLE_TERM', 30],
        ['DC & CI, MCEME', 'TWO_TERM_CUMULATIVE', 42],
      ]);
  });

  it('normalizes common appointment labels into warning position keys', () => {
    expect(normalizePositionKey('PI Cdr')).toBe('pi-cdr');
    expect(normalizePositionKey('PL Cdr')).toBe('pi-cdr');
    expect(normalizePositionKey('DS Coord / Dy Cdr')).toBe('ds-coord-dy-cdr');
    expect(normalizePositionKey('DS_COORD DS Coord / Dy Cdr')).toBe('ds-coord-dy-cdr');
    expect(normalizePositionKey('CDR')).toBe('cdr-ctw');
    expect(normalizePositionKey('Cdr, CTW')).toBe('cdr-ctw');
    expect(normalizePositionKey('DC & CI, MCEME')).toBe('dc-ci-mceme');
  });

  it('allows lower warning appointments to view higher warning criteria', () => {
    expect(canViewWarningCriterion('pi-cdr', 'ds-coord-dy-cdr')).toBe(true);
    expect(canViewWarningCriterion('pi-cdr', 'cdr-ctw')).toBe(true);
    expect(canViewWarningCriterion('pi-cdr', 'dc-ci-mceme')).toBe(true);
    expect(canViewWarningCriterion('ds-coord-dy-cdr', 'cdr-ctw')).toBe(true);
    expect(canViewWarningCriterion('cdr-ctw', 'dc-ci-mceme')).toBe(true);

    expect(canViewWarningCriterion('ds-coord-dy-cdr', 'pi-cdr')).toBe(false);
    expect(canViewWarningCriterion('dc-ci-mceme', 'cdr-ctw')).toBe(false);
  });

  it('derives policy keys from appointment-specific warning criteria labels', () => {
    expect(
      warningPolicyKeyForCriterion({
        positionKey: warningAppointmentPositionKey('appointment-ranapratap'),
        positionName: 'Ranapratap PL Cdr',
      }),
    ).toBe('pi-cdr');
    expect(
      warningPolicyKeyForCriterion({
        positionKey: warningAppointmentPositionKey('appointment-dcci'),
        positionName: 'DC & CI, MCEME',
      }),
    ).toBe('dc-ci-mceme');
  });

  it('overlays saved settings while preserving unsaved defaults', () => {
    const merged = mergeWarningCriteria([
      {
        ...DEFAULT_WARNING_CRITERIA[0],
        restrictionPoints: 11,
      },
    ]);

    expect(merged.find((item) => item.criterionKey === 'pi-cdr-single-term')?.restrictionPoints).toBe(11);
    expect(merged.find((item) => item.criterionKey === 'dc-ci-mceme-two-term')?.restrictionPoints).toBe(42);
  });

  it('builds editable criteria only for active appointment positions', () => {
    const plCdrKey = warningAppointmentPositionKey('appointment-pl-cdr-1');
    const adjutantKey = warningAppointmentPositionKey('appointment-adjutant-1');
    const criteria = buildWarningCriteriaForActiveAppointments(DEFAULT_WARNING_CRITERIA, [
      { positionKey: plCdrKey, policyKey: 'pi-cdr', positionName: 'PL Cdr' },
      { positionKey: adjutantKey, policyKey: 'adjutant', positionName: 'Adjutant' },
    ]);

    expect(criteria.map((item) => item.positionName)).toEqual(['PL Cdr', 'Adjutant']);
    expect(criteria.find((item) => item.positionKey === plCdrKey)?.restrictionPoints).toBe(10);
    expect(criteria.find((item) => item.positionKey === adjutantKey)?.restrictionPoints).toBe(1);
    expect(criteria.some((item) => item.positionKey === 'dc-ci-mceme')).toBe(false);
  });

  it('keeps separate PL Cdr appointment rows and deduplicates stale saved criteria', () => {
    const ranapratapKey = warningAppointmentPositionKey('appointment-ranapratap');
    const karnaKey = warningAppointmentPositionKey('appointment-karna');
    const criteria = buildWarningCriteriaForActiveAppointments(
      [
        {
          criterionKey: 'ranapratap-single-a',
          positionKey: ranapratapKey,
          positionName: 'Ranapratap Pl Cdr',
          triggerType: 'SINGLE_TERM',
          restrictionPoints: 10,
          isEnabled: true,
        },
        {
          criterionKey: 'ranapratap-single-b',
          positionKey: ranapratapKey,
          positionName: 'Ranapratap Pl Cdr',
          triggerType: 'SINGLE_TERM',
          restrictionPoints: 1,
          isEnabled: false,
        },
        {
          ...DEFAULT_WARNING_CRITERIA[0],
          criterionKey: 'stale-position-level-pl-cdr',
        },
      ],
      [
        { positionKey: ranapratapKey, policyKey: 'pi-cdr', positionName: 'Ranapratap Pl Cdr' },
        { positionKey: karnaKey, policyKey: 'pi-cdr', positionName: 'Karna PL CDR' },
      ],
    );

    expect(criteria.map((item) => item.positionName)).toEqual(['Ranapratap Pl Cdr', 'Karna PL CDR']);
    expect(criteria.filter((item) => item.positionName === 'Ranapratap Pl Cdr')).toHaveLength(1);
    expect(criteria.find((item) => item.positionKey === ranapratapKey)?.restrictionPoints).toBe(10);
    expect(criteria.find((item) => item.positionKey === karnaKey)?.restrictionPoints).toBe(10);
  });

  it('deduplicates generated warning notifications by OC before returning them', () => {
    const source = readFileSync('src/app/services/warningManagement.ts', 'utf8');

    expect(source).toContain('const unreadByOc = new Map<string, GeneratedWarningNotification>();');
    expect(source).toContain('canCurrentAppointmentViewCriterion(criterion, appointmentKey, viewerPolicyKeys)');
    expect(source).toContain('unreadByOc.set(ocId, pickWarningNotification(unreadByOc.get(ocId), generated));');
    expect(source).toContain('const unread = Array.from(unreadByOc.values()).map(stripGeneratedMeta);');
  });

  it('shows dynamic warning messages with the issuing appointment name', () => {
    const source = readFileSync('src/app/services/warningManagement.ts', 'utf8');

    expect(source).toContain('got warning by ${criterion.positionName}');
    expect(source).toContain('Current restriction points: ${match.points}.');
  });

  it('links 42-point two-term DC/CI warnings to the relegation workflow', () => {
    const source = readFileSync('src/app/services/warningManagement.ts', 'utf8');

    expect(source).toContain("criterion.triggerType === 'TWO_TERM_CUMULATIVE'");
    expect(source).toContain('DISCIPLINE_RELEGATION_RESTRICTION_POINTS');
    expect(source).toContain('source=discipline-warning');
  });
});
