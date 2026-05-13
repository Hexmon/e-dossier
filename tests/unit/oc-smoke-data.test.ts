import { describe, expect, it } from 'vitest';
import { isOcSmokeDataCandidate } from '../../scripts/oc-smoke-data';

describe('OC smoke data marker', () => {
  it('matches legacy zero-loss smoke rows', () => {
    expect(isOcSmokeDataCandidate({ ocNo: 'ZL-SINGLE-123', name: 'Zero Loss Single Edited 123' })).toBe(true);
    expect(isOcSmokeDataCandidate({ ocNo: 'ZL-BULK-123', name: 'Zero Loss Bulk 123' })).toBe(true);
  });

  it('matches current smoke rows', () => {
    expect(isOcSmokeDataCandidate({ ocNo: 'SMOKE-OC-SINGLE-123', name: 'OC Smoke Single 123' })).toBe(true);
    expect(isOcSmokeDataCandidate({ ocNo: 'SMOKE-OC-BULK-123', name: 'OC Smoke Bulk 123' })).toBe(true);
  });

  it('does not match normal OCs', () => {
    expect(isOcSmokeDataCandidate({ ocNo: '7530', name: 'Aryan Sharma' })).toBe(false);
    expect(isOcSmokeDataCandidate({ ocNo: '7528', name: 'Harshvardhan Tyagi' })).toBe(false);
  });
});
