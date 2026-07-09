import { z } from 'zod';

export const WARNING_TRIGGER_TYPES = ['SINGLE_TERM', 'TWO_TERM_CUMULATIVE'] as const;
export type WarningTriggerType = (typeof WARNING_TRIGGER_TYPES)[number];

export const WARNING_MODULES = ['DISCIPLINE', 'MEDICAL'] as const;
export type WarningModule = (typeof WARNING_MODULES)[number];

export const MEDICAL_WARNING_TRIGGER_TYPE = 'MEDICAL_ABSENCE_DAYS';
export type MedicalWarningTriggerType = typeof MEDICAL_WARNING_TRIGGER_TYPE;

export type WarningCriterion = {
  criterionKey: string;
  module: WarningModule;
  positionKey: string;
  positionName: string;
  triggerType: WarningTriggerType;
  restrictionPoints: number;
  absenceDays: number;
  isEnabled: boolean;
};

export type MedicalWarningCriterion = {
  criterionKey: string;
  module: 'MEDICAL';
  positionKey: string;
  positionName: string;
  triggerType: MedicalWarningTriggerType;
  restrictionPoints: number;
  absenceDays: number;
  isEnabled: boolean;
};

export const DISCIPLINE_RELEGATION_RESTRICTION_POINTS = 42;

export const DEFAULT_WARNING_CRITERIA: WarningCriterion[] = [
  {
    criterionKey: 'pi-cdr-single-term',
    module: 'DISCIPLINE',
    positionKey: 'pi-cdr',
    positionName: 'PL Cdr',
    triggerType: 'SINGLE_TERM',
    restrictionPoints: 10,
    absenceDays: 0,
    isEnabled: true,
  },
  {
    criterionKey: 'ds-coord-dy-cdr-single-term',
    module: 'DISCIPLINE',
    positionKey: 'ds-coord-dy-cdr',
    positionName: 'DS Coord / Dy Cdr',
    triggerType: 'SINGLE_TERM',
    restrictionPoints: 20,
    absenceDays: 0,
    isEnabled: true,
  },
  {
    criterionKey: 'cdr-ctw-single-term',
    module: 'DISCIPLINE',
    positionKey: 'cdr-ctw',
    positionName: 'Cdr, CTW',
    triggerType: 'SINGLE_TERM',
    restrictionPoints: 25,
    absenceDays: 0,
    isEnabled: true,
  },
  {
    criterionKey: 'dc-ci-mceme-single-term',
    module: 'DISCIPLINE',
    positionKey: 'dc-ci-mceme',
    positionName: 'DC & CI, MCEME',
    triggerType: 'SINGLE_TERM',
    restrictionPoints: 30,
    absenceDays: 0,
    isEnabled: true,
  },
  {
    criterionKey: 'dc-ci-mceme-two-term',
    module: 'DISCIPLINE',
    positionKey: 'dc-ci-mceme',
    positionName: 'DC & CI, MCEME',
    triggerType: 'TWO_TERM_CUMULATIVE',
    restrictionPoints: 42,
    absenceDays: 0,
    isEnabled: true,
  },
];

export const WARNING_POLICY_REFERENCE = DEFAULT_WARNING_CRITERIA;

export const WARNING_POSITION_LEVELS: Record<string, number> = {
  'pi-cdr': 10,
  'ds-coord-dy-cdr': 20,
  'cdr-ctw': 25,
  'dc-ci-mceme': 30,
};

export const WARNING_MODULE_INTRO =
  'OC discipline records are monitored for accumulated restrictions. Warning notifications are issued to the configured appointment once an OC reaches the configured restriction-point threshold, including single-term and two-consecutive-term cumulative checks.';

export const MEDICAL_WARNING_MODULE_INTRO =
  'OC medical category records are monitored for absence days. Medical warning notifications are issued to the configured appointment once an OC reaches the configured medical absence-day threshold.';

export const warningSettingsUpdateSchema = z.object({
  criteria: z.array(
    z.object({
      criterionKey: z.string().trim().min(1),
      module: z.literal('DISCIPLINE').default('DISCIPLINE'),
      positionKey: z.string().trim().min(1),
      positionName: z.string().trim().min(1),
      triggerType: z.enum(WARNING_TRIGGER_TYPES),
      restrictionPoints: z.coerce.number().int().min(1).max(999),
      absenceDays: z.coerce.number().int().min(0).max(999).default(0),
      isEnabled: z.boolean().default(true),
    }),
  ).default([]),
  medicalCriteria: z.array(
    z.object({
      criterionKey: z.string().trim().min(1),
      module: z.literal('MEDICAL').default('MEDICAL'),
      positionKey: z.string().trim().min(1),
      positionName: z.string().trim().min(1),
      triggerType: z.literal(MEDICAL_WARNING_TRIGGER_TYPE).default(MEDICAL_WARNING_TRIGGER_TYPE),
      restrictionPoints: z.coerce.number().int().min(0).max(999).default(0),
      absenceDays: z.coerce.number().int().min(0).max(999),
      isEnabled: z.boolean().default(true),
    }),
  ).default([]),
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
  if (normalized === 'cdr' || normalized === 'commander') return 'cdr-ctw';
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

export function warningPolicyKeyForCriterion(
  criterion: Pick<WarningCriterion, 'positionKey' | 'positionName'>,
) {
  const positionKey = normalizeWarningPositionKey(criterion.positionKey);
  if (!positionKey.startsWith('appointment:') && WARNING_POSITION_LEVELS[positionKey]) return positionKey;
  return normalizePositionKey(criterion.positionName);
}

export function canViewWarningCriterion(viewerPolicyKey: string, criterionPolicyKey: string) {
  const viewerLevel = WARNING_POSITION_LEVELS[viewerPolicyKey];
  const criterionLevel = WARNING_POSITION_LEVELS[criterionPolicyKey];
  return viewerLevel !== undefined && criterionLevel !== undefined && viewerLevel <= criterionLevel;
}

function criterionKeyForPosition(positionKey: string, triggerType: WarningTriggerType) {
  return `${positionKey.replace(/[^a-zA-Z0-9]+/g, '-')}-${triggerType.toLowerCase().replace(/_/g, '-')}`;
}

export function mergeWarningCriteria(saved: WarningCriterion[]) {
  const disciplineSaved = saved.filter((item) => item.module === 'DISCIPLINE');
  const byKey = new Map(disciplineSaved.map((item) => [item.criterionKey, item]));
  const merged = DEFAULT_WARNING_CRITERIA.map((item) => byKey.get(item.criterionKey) ?? item);
  for (const item of disciplineSaved) {
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
      if (criterion.module !== 'DISCIPLINE') continue;
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
        module: 'DISCIPLINE',
        positionKey: appointment.positionKey,
        positionName: appointment.positionName,
        triggerType: template.triggerType,
        restrictionPoints: savedMatch?.restrictionPoints ?? template.restrictionPoints,
        absenceDays: savedMatch?.absenceDays ?? 0,
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

function medicalCriterionKeyForPosition(positionKey: string) {
  return `${positionKey.replace(/[^a-zA-Z0-9]+/g, '-')}-medical-absence-days`;
}

export function mergeMedicalWarningCriteria(saved: MedicalWarningCriterion[]) {
  return saved.filter((item) => item.module === 'MEDICAL');
}

export function buildMedicalWarningCriteriaForActiveAppointments(
  saved: MedicalWarningCriterion[],
  appointmentPositions: Array<{ positionKey: string; positionName: string }>,
) {
  const criteria: MedicalWarningCriterion[] = [];

  for (const appointment of appointmentPositions) {
    const savedMatch = saved.find(
      (criterion) => normalizeWarningPositionKey(criterion.positionKey) === appointment.positionKey,
    );

    criteria.push({
      criterionKey: savedMatch?.criterionKey ?? medicalCriterionKeyForPosition(appointment.positionKey),
      module: 'MEDICAL',
      positionKey: appointment.positionKey,
      positionName: appointment.positionName,
      triggerType: MEDICAL_WARNING_TRIGGER_TYPE,
      restrictionPoints: 0,
      absenceDays: savedMatch?.absenceDays ?? 0,
      isEnabled: savedMatch?.isEnabled ?? true,
    });
  }

  return criteria;
}

export function parseMedicalAbsenceDays(value: string | null | undefined) {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text || ['nil', 'none', 'na', 'n/a', '-'].includes(text)) return null;
  const match = text.match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? Math.ceil(parsed) : null;
}
