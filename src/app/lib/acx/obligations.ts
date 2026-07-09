import type { Obligation } from '@hexmon_tech/acccess-control-core';

export type FieldObligationResult<TPayload extends Record<string, unknown>> = {
  allow: boolean;
  payload: TPayload;
  omittedFields: string[];
  maskedFields: string[];
  allowedFields: string[];
  deniedFields: string[];
  denyReason?: string;
};

function toFieldList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }
  return [];
}

function clonePayload<TPayload extends Record<string, unknown>>(payload: TPayload): TPayload {
  return { ...payload };
}

function applyFieldOperation<TPayload extends Record<string, unknown>>(
  payload: TPayload,
  fields: string[],
  operation: 'omit' | 'mask'
): { updated: TPayload; touched: string[] } {
  const next = clonePayload(payload);
  const touched: string[] = [];

  applyFieldList(next, fields, (target, key, field) => {
    touched.push(field);
    if (operation === 'omit') delete target[key];
    else target[key] = null;
  });

  return { updated: next, touched };
}

function applyAllowFields<TPayload extends Record<string, unknown>>(
  payload: TPayload,
  fields: string[]
): { updated: TPayload; touched: string[] } {
  if (fields.length === 0) return { updated: payload, touched: [] };
  const next = clonePayload(payload);
  const allowed = new Set(fields);
  const touched: string[] = [];

  for (const key of Object.keys(next as Record<string, unknown>)) {
    if (allowed.has(key)) continue;
    touched.push(key);
    delete (next as Record<string, unknown>)[key];
  }

  return { updated: next, touched };
}

function fieldMatches(key: string, field: string): boolean {
  if (key === field) return true;
  const lastSegment = field.includes('.') ? field.split('.').pop() : field;
  return key === lastSegment;
}

function applyFieldList(
  value: unknown,
  fields: string[],
  apply: (target: Record<string, unknown>, key: string, field: string) => void
) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item) => applyFieldList(item, fields, apply));
    return;
  }

  const target = value as Record<string, unknown>;
  for (const key of Object.keys(target)) {
    for (const field of fields) {
      if (fieldMatches(key, field)) {
        apply(target, key, field);
        break;
      }
    }
    applyFieldList(target[key], fields, apply);
  }
}

function hasAnyField(value: unknown, fields: string[]): string[] {
  const hits = new Set<string>();
  applyFieldList(value, fields, (_target, _key, field) => {
    hits.add(field);
  });
  return Array.from(hits);
}

export function applyFieldObligations<TPayload extends Record<string, unknown>>(
  payload: TPayload,
  obligations: Obligation[]
): FieldObligationResult<TPayload> {
  let allow = true;
  let denyReason: string | undefined;
  let nextPayload = clonePayload(payload);
  const omittedFields: string[] = [];
  const maskedFields: string[] = [];
  const deniedFields: string[] = [];
  const allowedFields: string[] = [];

  for (const obligation of obligations) {
    if (obligation.type === 'deny') {
      allow = false;
      denyReason = typeof (obligation.payload as { reason?: unknown })?.reason === 'string'
        ? (obligation.payload as { reason: string }).reason
        : 'Denied by policy obligation';
      continue;
    }

    if (obligation.type === 'omitFields') {
      const fields = toFieldList((obligation.payload as { fields?: unknown })?.fields);
      const { updated, touched } = applyFieldOperation(nextPayload, fields, 'omit');
      nextPayload = updated;
      omittedFields.push(...touched);
      continue;
    }

    if (obligation.type === 'maskFields') {
      const fields = toFieldList((obligation.payload as { fields?: unknown })?.fields);
      const { updated, touched } = applyFieldOperation(nextPayload, fields, 'mask');
      nextPayload = updated;
      maskedFields.push(...touched);
      continue;
    }

    if (obligation.type === 'allowFields') {
      const fields = toFieldList((obligation.payload as { fields?: unknown })?.fields);
      const { updated, touched } = applyAllowFields(nextPayload, fields);
      nextPayload = updated;
      allowedFields.push(...fields);
      omittedFields.push(...touched);
      continue;
    }

    if (obligation.type === 'denyFields') {
      const fields = toFieldList((obligation.payload as { fields?: unknown })?.fields);
      const hit = hasAnyField(nextPayload, fields);
      if (hit.length > 0) {
        allow = false;
        deniedFields.push(...hit);
        denyReason =
          typeof (obligation.payload as { reason?: unknown })?.reason === 'string'
            ? (obligation.payload as { reason: string }).reason
            : `Denied update for restricted fields: ${hit.join(', ')}`;
      }
      continue;
    }
  }

  return {
    allow,
    payload: nextPayload,
    omittedFields: Array.from(new Set(omittedFields)),
    maskedFields: Array.from(new Set(maskedFields)),
    allowedFields: Array.from(new Set(allowedFields)),
    deniedFields: Array.from(new Set(deniedFields)),
    denyReason,
  };
}
