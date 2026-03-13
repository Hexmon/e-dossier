import { describe, expect, it } from 'vitest';
import { resolveApiAction, resolvePageAction } from '@/app/lib/acx/action-map';

describe('action-map admin baselines', () => {
  it('keeps bulk pages out of the default admin baseline', () => {
    expect(resolvePageAction('/dashboard/manage-marks')?.adminBaseline).toBe(false);
    expect(resolvePageAction('/dashboard/manage-pt-marks')?.adminBaseline).toBe(false);
    expect(resolvePageAction('/dashboard/bulk-upload')?.adminBaseline).toBe(false);
  });

  it('keeps OC academics bulk read out of the default admin baseline', () => {
    expect(resolveApiAction('GET', '/api/v1/oc/academics/bulk')?.adminBaseline).toBe(false);
  });
});
