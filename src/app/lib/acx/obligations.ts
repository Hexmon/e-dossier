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
  const mutableNext = next as Record<string, unknown>;
  const touched: string[] = [];

  for (const field of fields) {
    if (!(field in mutableNext)) continue;
    touched.push(field);
    if (operation === 'omit') {
      delete mutableNext[field];
    } else {
      mutableNext[field] = null;
    }
  }

  return { updated: next, touched };
}

function applyAllowFields<TPayload extends Record<string, unknown>>(
  payload: TPayload,
  fields: string[]
): { updated: TPayload; touched: string[] } {
  if (fields.length === 0) return { updated: payload, touched: [] };
  const next = clonePayload(payload);
  const mutableNext = next as Record<string, unknown>;
  const allowed = new Set(fields);
  const touched: string[] = [];

  for (const key of Object.keys(mutableNext)) {
    if (allowed.has(key)) continue;
    touched.push(key);
    delete mutableNext[key];
  }

  return { updated: next, touched };
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
      const hit = fields.filter((field) => Object.prototype.hasOwnProperty.call(nextPayload, field));
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
