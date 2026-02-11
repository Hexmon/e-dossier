import { compilePolicySet } from '@hexmon_tech/acccess-control-compiler';
import type { PolicySet } from '@hexmon_tech/acccess-control-policy-dsl';
import { EmbeddedEngine } from '@hexmon_tech/acccess-control-engine-embedded';

const BASE_POLICY: PolicySet = {
  policyVersion: '1.0.0',
  rules: [
    {
      id: 'deny-explicit-actions',
      effect: 'deny',
      priority: 1000,
      actions: ['*'],
      resourceTypes: ['*'],
      when: {
        op: 'in',
        item: { ref: 'context.authz.action' },
        set: { ref: 'principal.attrs.deniedPermissions' },
      },
    },
    {
      id: 'allow-super-admin',
      effect: 'allow',
      priority: 900,
      actions: ['*'],
      resourceTypes: ['*'],
      when: {
        op: 'in',
        item: 'SUPER_ADMIN',
        set: { ref: 'principal.roles' },
      },
    },
    {
      id: 'allow-admin-baseline',
      effect: 'allow',
      priority: 850,
      actions: ['*'],
      resourceTypes: ['*'],
      when: {
        op: 'and',
        args: [
          {
            op: 'in',
            item: 'ADMIN',
            set: { ref: 'principal.roles' },
          },
          {
            op: 'eq',
            left: { ref: 'resource.attrs.adminBaseline' },
            right: true,
          },
        ],
      },
    },
    {
      id: 'allow-explicit-action-permission',
      effect: 'allow',
      priority: 800,
      actions: ['*'],
      resourceTypes: ['*'],
      when: {
        op: 'in',
        item: { ref: 'context.authz.action' },
        set: { ref: 'principal.attrs.permissions' },
      },
    },
  ],
};

let singleton: EmbeddedEngine | null = null;

export function createAuthzEngine(): EmbeddedEngine {
  const { ir, diagnostics } = compilePolicySet(BASE_POLICY, { mode: 'multi-tenant' });
  const errors = diagnostics.filter((d) => d.level === 'error');
  if (errors.length > 0) {
    const message = errors.map((d) => `${d.code}: ${d.message}`).join('; ');
    throw new Error(`Failed to compile base authz policy: ${message}`);
  }

  const engine = new EmbeddedEngine({
    mode: 'multi-tenant',
    fieldViolation: 'deny',
    cache: { enabled: true, maxSize: 2048, ttlMs: 30_000 },
    engineName: 'e-dossier-acx-v2',
  });
  engine.setPolicy(ir);
  return engine;
}

export function getAuthzEngine(): EmbeddedEngine {
  if (!singleton) {
    singleton = createAuthzEngine();
  }
  return singleton;
}

