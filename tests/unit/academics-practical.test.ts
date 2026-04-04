import { describe, expect, it } from 'vitest';

import {
  computePracticalTotal,
  getPracticalComponentValue,
  hasStructuredPracticalMarks,
  PRACTICAL_TOTAL_MAX_MARKS,
} from '@/lib/academics-practical';

describe('academics practical helpers', () => {
  it('computes total from named practical components', () => {
    const practical = {
      conductOfExp: 18,
      maintOfApp: 17,
      practicalTest: 39,
      vivaVoce: 12,
    };

    expect(hasStructuredPracticalMarks(practical)).toBe(true);
    expect(computePracticalTotal(practical)).toBe(86);
    expect(PRACTICAL_TOTAL_MAX_MARKS).toBe(100);
  });

  it('falls back to legacy final marks when structured components are absent', () => {
    const practical = {
      finalMarks: 74,
    };

    expect(hasStructuredPracticalMarks(practical)).toBe(false);
    expect(getPracticalComponentValue(practical, 'practicalTest')).toBe(74);
    expect(getPracticalComponentValue(practical, 'conductOfExp')).toBeNull();
    expect(computePracticalTotal(practical)).toBe(74);
  });
});
