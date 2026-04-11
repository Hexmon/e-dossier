import { describe, expect, it } from 'vitest';

import { computePracticalTotalMarks, resolvePracticalTotalMarks } from '@/app/lib/academic-marks-core';

describe('academic practical marks helpers', () => {
  it('sums the practical breakdown fields when they are present', () => {
    expect(
      computePracticalTotalMarks({
        contentOfExpMarks: 18,
        maintOfExpMarks: 17,
        practicalMarks: 33,
        vivaMarks: 12,
        finalMarks: 10,
      }),
    ).toBe(80);
  });

  it('falls back to final marks when no practical breakdown is stored', () => {
    expect(
      resolvePracticalTotalMarks({
        finalMarks: 64,
      }),
    ).toBe(64);
  });
});
