import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getTemplateMatchForSemesterMock } = vi.hoisted(() => ({
  getTemplateMatchForSemesterMock: vi.fn(),
}));

vi.mock('@/app/db/client', () => ({
  db: {},
}));

vi.mock('@/app/lib/http', () => ({
  json: {
    ok: vi.fn(),
    badRequest: vi.fn(),
    forbidden: vi.fn(),
  },
  handleApiError: vi.fn(),
}));

vi.mock('@/app/lib/authz', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/app/db/queries/oc', () => ({
  listOCsBasic: vi.fn(),
}));

vi.mock('@/app/db/queries/interviewTemplates', () => ({
  listInterviewTemplates: vi.fn(),
}));

vi.mock('@/app/db/schema/training/oc', () => ({
  ocCourseEnrollments: {},
}));

vi.mock('@/app/db/schema/training/interviewOc', () => ({
  ocInterviews: {},
  ocInterviewFieldValues: {},
  ocInterviewGroupRows: {},
  ocInterviewGroupValues: {},
}));

vi.mock('@/app/db/schema/training/interviewTemplates', () => ({
  interviewTemplateSections: {},
  interviewTemplateGroups: {},
  interviewTemplateFields: {},
}));

vi.mock('@/lib/interviewTemplateMatching', () => ({
  buildTemplateMappings: vi.fn((templates: unknown) => templates),
  getTemplateMatchForSemester: getTemplateMatchForSemesterMock,
}));

vi.mock('@/lib/audit', () => ({
  withAuditRoute: (_method: string, handler: unknown) => handler,
  AuditEventType: {
    API_REQUEST: 'API_REQUEST',
  },
  AuditResourceType: {
    API: 'API',
  },
}));

vi.mock('@/app/lib/acx/withAuthz', () => ({
  withAuthz: (handler: unknown) => handler,
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn(),
  eq: vi.fn(),
  inArray: vi.fn(),
  isNull: vi.fn(),
}));

import { buildExpectedSpecialInterviewSlots } from '@/lib/interview-pending-slots';

describe('admin interview pending slot selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('only requests special interview slots across semesters', () => {
    getTemplateMatchForSemesterMock.mockImplementation((_mappings, kind, semester) => {
      if (kind !== 'special') {
        return {
          template: {
            id: `unexpected-${kind}-${semester}`,
            semesters: [semester],
          },
        };
      }

      if (semester === 2) {
        return null;
      }

      return {
        template: {
          id: `special-template-${semester}`,
          semesters: [semester],
        },
      };
    });

    const result = {
      special: buildExpectedSpecialInterviewSlots({} as never),
    };

    expect(result).toEqual({
      special: [
        { templateId: 'special-template-1', semester: 1 },
        { templateId: 'special-template-3', semester: 3 },
        { templateId: 'special-template-4', semester: 4 },
        { templateId: 'special-template-5', semester: 5 },
        { templateId: 'special-template-6', semester: 6 },
      ],
    });
    expect(getTemplateMatchForSemesterMock).toHaveBeenCalledTimes(6);
    expect(getTemplateMatchForSemesterMock.mock.calls.map(([, kind]) => kind)).toEqual([
      'special',
      'special',
      'special',
      'special',
      'special',
      'special',
    ]);
  });

  it('skips special templates when the matched semester is not allowed', () => {
    getTemplateMatchForSemesterMock.mockImplementation((_mappings, _kind, semester) => ({
      template: {
        id: `special-template-${semester}`,
        semesters: semester === 4 ? [5] : [semester],
      },
    }));

    const result = {
      special: buildExpectedSpecialInterviewSlots({} as never),
    };

    expect(result.special).toEqual([
      { templateId: 'special-template-1', semester: 1 },
      { templateId: 'special-template-2', semester: 2 },
      { templateId: 'special-template-3', semester: 3 },
      { templateId: 'special-template-5', semester: 5 },
      { templateId: 'special-template-6', semester: 6 },
    ]);
  });
});
