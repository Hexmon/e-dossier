import { pgEnum } from 'drizzle-orm/pg-core';

export const positionType = pgEnum('position_type', [
  'COMMANDANT',
  'DEPUTY_COMMANDANT',
  'HOAT',
  'DEPUTY_SECRETARY',
  'PLATOON_COMMANDER',
  'CCO',
  'ADMIN',
  'SUPER_ADMIN',
]);

export const assignmentKind = pgEnum('assignment_kind', ['PRIMARY', 'OFFICIATING']);

// Generic scoping so we don't couple to other domains now.
// Later you can add UNIT, COMPANY, etc.
export const scopeTypeEnum = pgEnum('scope_type', ['GLOBAL', 'PLATOON']);
