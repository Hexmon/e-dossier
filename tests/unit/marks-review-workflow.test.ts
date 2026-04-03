import { describe, expect, it } from 'vitest';
import { ApiError } from '@/app/lib/http';
import {
  assertWorkflowRevision,
  buildAcademicsPublishItems,
  buildPtPublishItems,
  getAllowedWorkflowActions,
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
      dataEntryUserIds: ['maker'],
      verificationUserIds: ['verifier'],
      postVerificationOverrideMode: 'ADMIN_AND_SUPER_ADMIN' as const,
    };

    const maker = resolveWorkflowActorContext({
      settings,
      userId: 'maker',
      roles: [],
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
          practical: { finalMarks: 20 },
        },
      ],
    } as any);

    expect(items).toEqual([
      {
        ocId: 'oc-1',
        semester: 2,
        subjectId: 'subject-1',
        theory: { phaseTest1Marks: 11 },
        practical: { finalMarks: 20 },
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
});
