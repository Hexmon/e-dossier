import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as postOfferings } from '@/app/api/v1/admin/courses/[courseId]/offerings/route';
import { PATCH as patchOffering } from '@/app/api/v1/admin/courses/[courseId]/offerings/[offeringId]/route';
import { createRouteContext, makeJsonRequest } from '../utils/next';
import * as authz from '@/app/lib/authz';
import * as courseQueries from '@/app/db/queries/courses';
import * as offeringQueries from '@/app/db/queries/offerings';
import * as instructorQueries from '@/app/db/queries/instructors';
import * as subjectQueries from '@/app/db/queries/subjects';

vi.mock('@/app/lib/authz', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/app/db/queries/courses', () => ({
  getCourse: vi.fn(),
  getCourseOffering: vi.fn(),
  listCourseOfferings: vi.fn(),
}));

vi.mock('@/app/db/queries/offerings', () => ({
  createOffering: vi.fn(),
  replaceOfferingInstructors: vi.fn(),
  updateOffering: vi.fn(),
  softDeleteOffering: vi.fn(),
  hardDeleteOffering: vi.fn(),
}));

vi.mock('@/app/db/queries/instructors', () => ({
  findMissingInstructorIds: vi.fn(),
}));

vi.mock('@/app/db/queries/subjects', () => ({
  getSubject: vi.fn(),
  getSubjectByCode: vi.fn(),
}));

const courseId = '11111111-1111-4111-8111-111111111111';
const offeringId = '22222222-2222-4222-8222-222222222222';
const subjectId = '33333333-3333-4333-8333-333333333333';

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(authz.requireAuth).mockResolvedValue({
    userId: 'admin-1',
    roles: ['ADMIN'],
    claims: {},
  } as Awaited<ReturnType<typeof authz.requireAuth>>);

  vi.mocked(courseQueries.getCourse).mockResolvedValue({
    id: courseId,
    code: 'TES-1',
    title: 'Test Course',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as any);

  vi.mocked(subjectQueries.getSubject).mockResolvedValue({
    id: subjectId,
    code: 'SUB-1',
    name: 'Signals',
    branch: 'C',
    noOfPeriods: 0,
    hasTheory: true,
    hasPractical: true,
    defaultTheoryCredits: 3,
    defaultPracticalCredits: 1,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as any);
  vi.mocked(subjectQueries.getSubjectByCode).mockResolvedValue({
    id: subjectId,
    code: 'SUB-1',
    name: 'Signals',
    branch: 'C',
    noOfPeriods: 0,
    hasTheory: true,
    hasPractical: true,
    defaultTheoryCredits: 3,
    defaultPracticalCredits: 1,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as any);

  vi.mocked(courseQueries.listCourseOfferings).mockResolvedValue([]);
  vi.mocked(instructorQueries.findMissingInstructorIds).mockResolvedValue([]);
  vi.mocked(offeringQueries.replaceOfferingInstructors).mockResolvedValue([]);
  vi.mocked(offeringQueries.createOffering).mockResolvedValue({
    id: offeringId,
    courseId,
    subjectId,
    semester: 1,
    includeTheory: true,
    includePractical: true,
    theoryCredits: 3,
    practicalCredits: 1,
  } as any);

  vi.mocked(courseQueries.getCourseOffering).mockResolvedValue({
    id: offeringId,
    courseId,
    semester: 1,
    includeTheory: true,
    includePractical: false,
    theoryCredits: 3,
    practicalCredits: null,
    subject: {
      id: subjectId,
      code: 'SUB-1',
      name: 'Signals',
      branch: 'C',
      noOfPeriods: 0,
      hasTheory: true,
      hasPractical: true,
      defaultTheoryCredits: 3,
      defaultPracticalCredits: 1,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  } as any);

  vi.mocked(offeringQueries.updateOffering).mockResolvedValue({
    before: {
      id: offeringId,
      courseId,
      subjectId,
      includeTheory: true,
      includePractical: false,
      theoryCredits: 3,
      practicalCredits: null,
    },
    after: {
      id: offeringId,
      courseId,
      subjectId,
      includeTheory: true,
      includePractical: true,
      theoryCredits: 3,
      practicalCredits: 1,
    },
  } as any);
});

describe('course offerings credit defaults', () => {
  it('defaults include flags and credits from the selected subject during creation', async () => {
    const req = makeJsonRequest({
      method: 'POST',
      path: `/api/v1/admin/courses/${courseId}/offerings`,
      body: {
        subjectId,
        semester: 1,
      },
    });

    const res = await postOfferings(req as any, createRouteContext({ courseId }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(offeringQueries.createOffering).toHaveBeenCalledWith({
      courseId,
      subjectId,
      semester: 1,
      includeTheory: true,
      includePractical: true,
      theoryCredits: 3,
      practicalCredits: 1,
    });
  });

  it('preserves explicit credit overrides during creation', async () => {
    const req = makeJsonRequest({
      method: 'POST',
      path: `/api/v1/admin/courses/${courseId}/offerings`,
      body: {
        subjectId,
        semester: 1,
        includeTheory: true,
        includePractical: true,
        theoryCredits: 4,
        practicalCredits: 2,
      },
    });

    const res = await postOfferings(req as any, createRouteContext({ courseId }));

    expect(res.status).toBe(201);
    expect(offeringQueries.createOffering).toHaveBeenCalledWith({
      courseId,
      subjectId,
      semester: 1,
      includeTheory: true,
      includePractical: true,
      theoryCredits: 4,
      practicalCredits: 2,
    });
  });

  it('defaults practical credits from the subject when practical is enabled later', async () => {
    const req = makeJsonRequest({
      method: 'PATCH',
      path: `/api/v1/admin/courses/${courseId}/offerings/${offeringId}`,
      body: {
        includePractical: true,
      },
    });

    const res = await patchOffering(req as any, createRouteContext({ courseId, offeringId }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(offeringQueries.updateOffering).toHaveBeenCalledWith(
      offeringId,
      expect.objectContaining({
        includePractical: true,
        practicalCredits: 1,
      })
    );
  });
});
