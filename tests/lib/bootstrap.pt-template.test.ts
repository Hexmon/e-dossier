import { describe, expect, it } from 'vitest';
import { getPtTemplatePack } from '@/app/lib/bootstrap/pt-template';

describe('PT template pack', () => {
  it('loads default profile with semesters 1 to 6', () => {
    const pack = getPtTemplatePack('default');

    expect(pack.module).toBe('pt');
    expect(pack.profile).toBe('default');
    expect(pack.semesters.map((item) => item.semester)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('throws for unsupported profile', () => {
    expect(() => getPtTemplatePack('legacy' as any)).toThrow(
      'Unsupported PT template profile "legacy". Supported: default'
    );
  });
});

