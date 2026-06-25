import { describe, expect, it } from 'vitest';
import { ApiError } from '@/app/lib/http';
import {
  assertWorkflowRevision,
  buildAcademicsPublishItems,
  buildPtPublishItems,
  getAllowedWorkflowActions,
  isMarksWorkflowModuleActive,
  reconcileWorkflowDraftPayloadWithLive,
  removeOcFromWorkflowDraftPayload,
  retainKnownWorkflowUserIds,
  resolveWorkflowActorContext,
  validateWorkflowUserAssignments,
} from '@/app/lib/marks-review-workflow';

describe('marksReviewWorkflow core', () => {
  it('rejects overlapping data-entry and verification users', () => {
    expect(() =>
      validateWorkflowUserAssignments(
        {
          dataEntryUserIds: ['11111111-1111-4111-8111-111111111111'],
          verificationUserIds: ['11111111-1111-4111-8111-111111111111'],
          postVerificationOverrideMode: 'SUPER_ADMIN_ONLY',
        },
        'ACADEMICS_BULK',
      ),
    ).toThrow(ApiError);
  });

  it('resolves allowed actions for maker, verifier, and override actors', () => {
    const settings = {
      dataEntryUserIds: [],
      verificationUserIds: ['verifier'],
      postVerificationOverrideMode: 'ADMIN_AND_SUPER_ADMIN' as const,
    };

    const maker = resolveWorkflowActorContext({
      settings,
      userId: 'pl-cdr',
      roles: ['PLATOON_COMMANDER'],
    });
    const verifier = resolveWorkflowActorContext({
      settings,
      userId: 'verifier',
      roles: [],
    });
    const adminOverride = resolveWorkflowActorContext({
      settings,
      userId: 'admin',
      roles: ['ADMIN'],
    });

    expect(
      getAllowedWorkflowActions({
        isActive: true,
        status: 'DRAFT',
        actor: maker,
      }),
    ).toEqual(['SAVE_DRAFT', 'SUBMIT_FOR_VERIFICATION']);

    expect(
      getAllowedWorkflowActions({
        isActive: true,
        status: 'PENDING_VERIFICATION',
        actor: verifier,
      }),
    ).toEqual(['SAVE_DRAFT', 'REQUEST_CHANGES', 'VERIFY_AND_PUBLISH']);

    expect(
      getAllowedWorkflowActions({
        isActive: true,
        status: 'VERIFIED',
        actor: adminOverride,
      }),
    ).toEqual(['OVERRIDE_PUBLISH']);
  });

  it('treats verifier-only configuration as an active workflow because platoon commanders are implicit makers', () => {
    const settings = validateWorkflowUserAssignments(
      {
        dataEntryUserIds: [],
        verificationUserIds: ['22222222-2222-4222-8222-222222222222'],
        postVerificationOverrideMode: 'SUPER_ADMIN_ONLY',
      },
      'ACADEMICS_BULK',
    );

    expect(isMarksWorkflowModuleActive(settings)).toBe(true);
  });

  it('drops stale workflow user ids that no longer resolve to existing accounts', () => {
    expect(
      retainKnownWorkflowUserIds(
        [
          '11111111-1111-4111-8111-111111111111',
          '22222222-2222-4222-8222-222222222222',
        ],
        ['22222222-2222-4222-8222-222222222222'],
      ),
    ).toEqual(['22222222-2222-4222-8222-222222222222']);
  });

  it('throws stale revision conflicts', () => {
    expect(() => assertWorkflowRevision(3, 2)).toThrow(ApiError);
  });

  it('maps academics draft payloads to publish items', () => {
    const items = buildAcademicsPublishItems({
      courseId: 'course-1',
      semester: 2,
      subjectId: 'subject-1',
      subject: {
        id: 'subject-1',
        code: 'PHY101',
        name: 'Physics I',
      },
      items: [
        {
          ocId: 'oc-1',
          ocNo: 'OC-1',
          name: 'Cadet One',
          theory: { phaseTest1Marks: 11 },
          practical: {
            contentOfExpMarks: 18,
            maintOfExpMarks: 17,
            practicalMarks: 33,
            vivaMarks: 12,
            finalMarks: 80,
          },
        },
      ],
    } as any);

    expect(items).toEqual([
      {
        ocId: 'oc-1',
        semester: 2,
        subjectId: 'subject-1',
        theory: { phaseTest1Marks: 11 },
        practical: {
          contentOfExpMarks: 18,
          maintOfExpMarks: 17,
          practicalMarks: 33,
          vivaMarks: 12,
          finalMarks: 80,
        },
      },
    ]);
  });

  it('skips academics publish items with no entered marks', () => {
    const items = buildAcademicsPublishItems({
      courseId: 'course-1',
      semester: 2,
      subjectId: 'subject-1',
      subject: {
        id: 'subject-1',
        code: 'PHY101',
        name: 'Physics I',
      },
      items: [
        {
          ocId: 'blank-oc',
          ocNo: 'OC-0',
          name: 'Blank Cadet',
          theory: {},
          practical: {},
        },
        {
          ocId: 'undefined-oc',
          ocNo: 'OC-2',
          name: 'Undefined Cadet',
          theory: { phaseTest1Marks: undefined },
          practical: { finalMarks: undefined },
        },
      ],
    } as any);

    expect(items).toEqual([]);
  });

  it('keeps explicit zero and null academic draft values for publishing', () => {
    const items = buildAcademicsPublishItems({
      courseId: 'course-1',
      semester: 2,
      subjectId: 'subject-1',
      subject: {
        id: 'subject-1',
        code: 'PHY101',
        name: 'Physics I',
      },
      items: [
        {
          ocId: 'zero-oc',
          ocNo: 'OC-0',
          name: 'Zero Cadet',
          theory: { phaseTest1Marks: 0 },
          practical: { finalMarks: null },
        },
      ],
    } as any);

    expect(items).toEqual([
      {
        ocId: 'zero-oc',
        semester: 2,
        subjectId: 'subject-1',
        theory: { phaseTest1Marks: 0 },
        practical: { finalMarks: null },
      },
    ]);
  });

  it('maps PT draft payloads to publish items', () => {
    const items = buildPtPublishItems({
      courseId: 'course-1',
      semester: 3,
      template: { types: [] },
      items: [
        {
          oc: { id: 'oc-1', ocNo: 'OC-1', name: 'Cadet One' },
          scores: [{ ptTaskScoreId: 'score-1', marksScored: 90 }],
          motivationValues: [{ fieldId: 'field-1', value: 'Excellent' }],
        },
      ],
    } as any);

    expect(items).toEqual([
      {
        ocId: 'oc-1',
        semester: 3,
        scores: [{ ptTaskScoreId: 'score-1', marksScored: 90 }],
        motivationValues: [{ fieldId: 'field-1', value: 'Excellent' }],
      },
    ]);
  });

  it('reconciles academics drafts to the live course roster while preserving marks', () => {
    const live = {
      courseId: '11111111-1111-4111-8111-111111111111',
      semester: 1,
      subjectId: '22222222-2222-4222-8222-222222222222',
      subject: {
        id: '22222222-2222-4222-8222-222222222222',
        code: 'CSIT-001',
        name: 'Computer Science',
      },
      items: [
        { ocId: '33333333-3333-4333-8333-333333333333', ocNo: '7534', name: 'Current OC' },
        { ocId: '44444444-4444-4444-8444-444444444444', ocNo: '7535', name: 'New OC' },
      ],
    };
    const draft = {
      ...live,
      items: [
        {
          ocId: '33333333-3333-4333-8333-333333333333',
          ocNo: 'OLD-7534',
          name: 'Old Current OC',
          theory: { phaseTest1Marks: 10 },
        },
        {
          ocId: '55555555-5555-4555-8555-555555555555',
          ocNo: '7222',
          name: 'Moved OC',
          theory: { phaseTest1Marks: 99 },
        },
      ],
    };

    const result = reconcileWorkflowDraftPayloadWithLive(draft as any, live as any);

    expect(result.items).toEqual([
      {
        ocId: '33333333-3333-4333-8333-333333333333',
        ocNo: '7534',
        name: 'Current OC',
        theory: { phaseTest1Marks: 10 },
        practical: undefined,
      },
      { ocId: '44444444-4444-4444-8444-444444444444', ocNo: '7535', name: 'New OC' },
    ]);
  });

  it('reconciles PT drafts to the live course roster while preserving scores', () => {
    const live = {
      courseId: '11111111-1111-4111-8111-111111111111',
      semester: 2,
      template: { id: 'template-live' },
      items: [
        {
          oc: { id: '33333333-3333-4333-8333-333333333333', ocNo: '7534', name: 'Current OC' },
          scores: [],
          motivationValues: [],
        },
        {
          oc: { id: '44444444-4444-4444-8444-444444444444', ocNo: '7535', name: 'New OC' },
          scores: [],
          motivationValues: [],
        },
      ],
    };
    const draft = {
      ...live,
      template: { id: 'template-old' },
      items: [
        {
          oc: { id: '33333333-3333-4333-8333-333333333333', ocNo: 'OLD-7534', name: 'Old Current OC' },
          scores: [{ ptTaskScoreId: '66666666-6666-4666-8666-666666666666', marksScored: 18 }],
          motivationValues: [{ fieldId: '77777777-7777-4777-8777-777777777777', value: 'Good' }],
        },
        {
          oc: { id: '55555555-5555-4555-8555-555555555555', ocNo: '7222', name: 'Moved OC' },
          scores: [{ ptTaskScoreId: '88888888-8888-4888-8888-888888888888', marksScored: 30 }],
          motivationValues: [],
        },
      ],
    };

    const result = reconcileWorkflowDraftPayloadWithLive(draft as any, live as any);

    expect(result).toEqual({
      ...live,
      items: [
        {
          oc: { id: '33333333-3333-4333-8333-333333333333', ocNo: '7534', name: 'Current OC' },
          scores: [{ ptTaskScoreId: '66666666-6666-4666-8666-666666666666', marksScored: 18 }],
          motivationValues: [{ fieldId: '77777777-7777-4777-8777-777777777777', value: 'Good' }],
        },
        {
          oc: { id: '44444444-4444-4444-8444-444444444444', ocNo: '7535', name: 'New OC' },
          scores: [],
          motivationValues: [],
        },
      ],
    });
  });

  it('removes a relegated OC from academic workflow draft payloads', () => {
    const result = removeOcFromWorkflowDraftPayload(
      {
        courseId: 'course-1',
        semester: 4,
        subjectId: 'subject-1',
        items: [
          { ocId: 'keep-oc', ocNo: '1', name: 'Keep' },
          { ocId: 'delete-oc', ocNo: '2', name: 'Delete' },
        ],
      },
      'delete-oc',
    );

    expect(result.removedCount).toBe(1);
    expect(result.payload.items).toEqual([{ ocId: 'keep-oc', ocNo: '1', name: 'Keep' }]);
  });

  it('removes a relegated OC from PT workflow draft payloads', () => {
    const result = removeOcFromWorkflowDraftPayload(
      {
        courseId: 'course-1',
        semester: 4,
        template: {},
        items: [
          { oc: { id: 'delete-oc', ocNo: '2', name: 'Delete' }, scores: [], motivationValues: [] },
          { oc: { id: 'keep-oc', ocNo: '1', name: 'Keep' }, scores: [], motivationValues: [] },
        ],
      },
      'delete-oc',
    );

    expect(result.removedCount).toBe(1);
    expect(result.payload.items).toEqual([
      { oc: { id: 'keep-oc', ocNo: '1', name: 'Keep' }, scores: [], motivationValues: [] },
    ]);
  });
});
