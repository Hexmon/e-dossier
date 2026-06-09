import { z } from 'zod';

export const WARNING_TRIGGER_TYPES = ['SINGLE_TERM', 'TWO_TERM_CUMULATIVE'] as const;
export type WarningTriggerType = (typeof WARNING_TRIGGER_TYPES)[number];

export type WarningCriterion = {
  criterionKey: string;
  positionKey: string;
  positionName: string;
  triggerType: WarningTriggerType;
  restrictionPoints: number;
  isEnabled: boolean;
};

export const DEFAULT_WARNING_CRITERIA: WarningCriterion[] = [
  {
    criterionKey: 'pi-cdr-single-term',
    positionKey: 'pi-cdr',
    positionName: 'PL Cdr',
    triggerType: 'SINGLE_TERM',
    restrictionPoints: 10,
    isEnabled: true,
  },
  {
    criterionKey: 'ds-coord-dy-cdr-single-term',
    positionKey: 'ds-coord-dy-cdr',
    positionName: 'DS Coord / Dy Cdr',
    triggerType: 'SINGLE_TERM',
    restrictionPoints: 20,
    isEnabled: true,
  },
  {
    criterionKey: 'cdr-ctw-single-term',
    positionKey: 'cdr-ctw',
    positionName: 'Cdr, CTW',
    triggerType: 'SINGLE_TERM',
    restrictionPoints: 25,
    isEnabled: true,
  },
  {
    criterionKey: 'dc-ci-mceme-single-term',
    positionKey: 'dc-ci-mceme',
    positionName: 'DC & CI, MCEME',
    triggerType: 'SINGLE_TERM',
    restrictionPoints: 30,
    isEnabled: true,
  },
  {
    criterionKey: 'dc-ci-mceme-two-term',
    positionKey: 'dc-ci-mceme',
    positionName: 'DC & CI, MCEME',
    triggerType: 'TWO_TERM_CUMULATIVE',
    restrictionPoints: 42,
    isEnabled: true,
  },
];

export const WARNING_POLICY_REFERENCE = DEFAULT_WARNING_CRITERIA;

export const WARNING_MODULE_INTRO =
  'OC discipline records are monitored for accumulated restrictions. Warning notifications are issued to the configured appointment once an OC reaches the configured restriction-point threshold, including single-term and two-consecutive-term cumulative checks.';

export const warningSettingsUpdateSchema = z.object({
  criteria: z.array(
    z.object({
      criterionKey: z.string().trim().min(1),
      positionKey: z.string().trim().min(1),
      positionName: z.string().trim().min(1),
      triggerType: z.enum(WARNING_TRIGGER_TYPES),
      restrictionPoints: z.coerce.number().int().min(1).max(999),
      isEnabled: z.boolean().default(true),
    }),
  ),
});

export const warningNotificationActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('MARK_AS_READ'), notificationId: z.string().trim().min(1) }),
  z.object({ action: z.literal('MARK_ALL_AS_READ') }),
]);

export function normalizePositionKey(value: string | null | undefined) {
  const normalized = String(value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  if (!normalized) return '';
  if (normalized.includes('dc') && normalized.includes('ci')) return 'dc-ci-mceme';
  if ((normalized.includes('ds coord') || normalized.includes('deputy')) && normalized.includes('cdr')) {
    return 'ds-coord-dy-cdr';
  }
  if (normalized.includes('cdr') && normalized.includes('ctw')) return 'cdr-ctw';
  if ((normalized.includes('pi') || normalized.includes('pl')) && normalized.includes('cdr')) return 'pi-cdr';
  return normalized.replace(/\s+/g, '-');
}

export function warningAppointmentPositionKey(appointmentId: string) {
  return `appointment:${appointmentId}`;
}

export function normalizeWarningPositionKey(value: string | null | undefined) {
  const raw = String(value ?? '').trim().toLowerCase();
  return raw.startsWith('appointment:') ? raw : normalizePositionKey(value);
}

function criterionKeyForPosition(positionKey: string, triggerType: WarningTriggerType) {
  return `${positionKey.replace(/[^a-zA-Z0-9]+/g, '-')}-${triggerType.toLowerCase().replace(/_/g, '-')}`;
}

export function mergeWarningCriteria(saved: WarningCriterion[]) {
  const byKey = new Map(saved.map((item) => [item.criterionKey, item]));
  const merged = DEFAULT_WARNING_CRITERIA.map((item) => byKey.get(item.criterionKey) ?? item);
  for (const item of saved) {
    if (!DEFAULT_WARNING_CRITERIA.some((defaultItem) => defaultItem.criterionKey === item.criterionKey)) {
      merged.push(item);
    }
  }
  return merged;
}

export function buildWarningCriteriaForActiveAppointments(
  saved: WarningCriterion[],
  appointmentPositions: Array<{ positionKey: string; positionName: string; policyKey?: string }>,
) {
  const criteria: WarningCriterion[] = [];

  for (const appointment of appointmentPositions) {
    const matchesByTrigger = new Map<WarningTriggerType, WarningCriterion>();
    for (const criterion of saved) {
      if (normalizeWarningPositionKey(criterion.positionKey) !== appointment.positionKey) continue;
      if (!matchesByTrigger.has(criterion.triggerType)) matchesByTrigger.set(criterion.triggerType, criterion);
    }

    const policyTemplates = WARNING_POLICY_REFERENCE.filter(
      (item) => normalizePositionKey(item.positionKey) === (appointment.policyKey ?? appointment.positionKey),
    );
    const templates = policyTemplates.length
      ? policyTemplates
      : [{
          triggerType: 'SINGLE_TERM' as const,
          restrictionPoints: 1,
          isEnabled: false,
        }];

    for (const template of templates) {
      const savedMatch = matchesByTrigger.get(template.triggerType);
      criteria.push({
        criterionKey: savedMatch?.criterionKey ?? criterionKeyForPosition(appointment.positionKey, template.triggerType),
        positionKey: appointment.positionKey,
        positionName: appointment.positionName,
        triggerType: template.triggerType,
        restrictionPoints: savedMatch?.restrictionPoints ?? template.restrictionPoints,
        isEnabled: savedMatch?.isEnabled ?? template.isEnabled,
      });
      matchesByTrigger.delete(template.triggerType);
    }

    for (const criterion of matchesByTrigger.values()) {
      criteria.push({
        ...criterion,
        positionKey: appointment.positionKey,
        positionName: appointment.positionName,
      });
    }
  }

  return criteria;
}
