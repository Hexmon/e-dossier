import { describe, expect, it } from 'vitest';
import { applyFieldObligations } from '@/app/lib/acx/obligations';

describe('field obligations', () => {
  it('omits matching fields recursively while preserving response envelopes', () => {
    const result = applyFieldObligations(
      {
        message: 'ok',
        items: [
          { id: '1', name: 'A', email: 'a@example.test' },
          { id: '2', name: 'B', email: 'b@example.test' },
        ],
      },
      [{ type: 'omitFields', payload: { fields: ['email'] } }] as any
    );

    expect(result.allow).toBe(true);
    expect(result.payload).toEqual({
      message: 'ok',
      items: [
        { id: '1', name: 'A' },
        { id: '2', name: 'B' },
      ],
    });
    expect(result.omittedFields).toEqual(['email']);
  });

  it('denies when a restricted nested field is present', () => {
    const result = applyFieldObligations(
      { user: { id: '1', phone: '123' } },
      [{ type: 'denyFields', payload: { fields: ['phone'] } }] as any
    );

    expect(result.allow).toBe(false);
    expect(result.deniedFields).toEqual(['phone']);
  });
});
