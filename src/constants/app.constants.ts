// src\constants\app.constants.ts
export const POS = {
  COMMANDANT: 'COMMANDANT',
  DCCI: 'DCCI',
  COMMANDER: "COMMANDER",
  DEPUTY_COMMANDANT: 'DEPUTY_COMMANDANT',
  DEPUTY_SECRETARY: 'DEPUTY_SECRETARY',
  HOAT: 'HOAT',
  PLATOON_COMMANDER: 'PLATOON_COMMANDER',
  CCO: 'CCO',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

export const SCOPE = {
  GLOBAL: 'GLOBAL',
  PLATOON: 'PLATOON',
} as const;

export type Position = typeof POS[keyof typeof POS];
export type ScopeType = typeof SCOPE[keyof typeof SCOPE];
