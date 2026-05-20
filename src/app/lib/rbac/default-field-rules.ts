export type RbacFieldRuleMode = 'ALLOW' | 'DENY' | 'OMIT' | 'MASK';

export type RbacDefaultFieldRule = {
  key: string;
  label: string;
  permissionKey: string;
  roleKeys: string[];
  positionKeys: string[];
  mode: RbacFieldRuleMode;
  fields: string[];
  note?: string | null;
};

export function getRbacDefaultFieldRules(): RbacDefaultFieldRule[] {
  return [];
}
