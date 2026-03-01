import { describe, expect, it } from 'vitest';
import { getOlqDefaultTemplatePack } from '@/app/lib/olq/default-template';
import { olqTemplateApplySchema } from '@/app/lib/olq-validators';

describe('OLQ default template pack', () => {
  it('contains the standard four categories in deterministic order', () => {
    const pack = getOlqDefaultTemplatePack();
    expect(pack.version).toBe('default.v1');
    expect(pack.categories.map((item) => item.title)).toEqual([
      'PLG & ORG',
      'Social Adjustment',
      'Social Effectiveness',
      'Dynamic',
    ]);
  });

  it('sets max marks to 20 for all default subtitles', () => {
    const pack = getOlqDefaultTemplatePack();
    const maxMarks = pack.categories.flatMap((category) =>
      category.subtitles.map((subtitle) => subtitle.maxMarks)
    );
    expect(maxMarks.every((value) => value === 20)).toBe(true);
  });
});

describe('olqTemplateApplySchema', () => {
  it('requires courseId when scope=course', () => {
    const parsed = olqTemplateApplySchema.safeParse({
      scope: 'course',
      mode: 'replace',
      dryRun: true,
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts scope=all without courseId', () => {
    const parsed = olqTemplateApplySchema.safeParse({
      scope: 'all',
      mode: 'upsert_missing',
      dryRun: true,
    });
    expect(parsed.success).toBe(true);
  });
});
