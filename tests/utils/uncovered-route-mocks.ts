import { vi } from 'vitest';
import { ApiError } from '@/app/lib/http';
import { createAsyncModuleMock, createDbMock, createSchemaModuleMock } from './generic-api-mocks';

const auditLogMock = vi.fn(async () => undefined);

const genericModuleMock = createAsyncModuleMock();
const schemaModuleMock = createSchemaModuleMock();
const dbClientMock = createDbMock();

const authzMock = {
  requireAuth: vi.fn(),
  requireAdmin: vi.fn(),
  hasAdminRole: vi.fn((roles: string[]) => roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')),
};

const relegationAuthMock = {
  getRelegationAccessContext: vi.fn(),
  assertCanWriteSingle: vi.fn(),
  assertCanPromoteBatch: vi.fn(),
};

const ocChecksMock = {
  mustBeAuthed: vi.fn(),
  mustHaveOcAccess: vi.fn(),
  mustBeAdmin: vi.fn(),
  mustBeAcademicsEditor: vi.fn(),
  assertOcSemesterWriteAllowed: vi.fn(),
  ensureOcExists: vi.fn(),
  parseParam: vi.fn(async ({ params }: any, schema: any) => {
    const resolvedParams = await params;
    return schema?.parse ? schema.parse(resolvedParams) : resolvedParams;
  }),
};

const authorizationMock = {
  authorizeOcAccess: vi.fn(async () => undefined),
};

const routeLoggingMock = {
  withRouteLogging: (_method: string, handler: any) => async (req: any, context: any) => {
    req.audit ??= { log: auditLogMock };
    return handler(req, context);
  },
};

const rateLimitMock = {
  getClientIp: vi.fn(() => '127.0.0.1'),
  checkLoginRateLimit: vi.fn(async () => ({
    success: true,
    limit: 5,
    remaining: 5,
    reset: Date.now() + 60_000,
  })),
  checkSignupRateLimit: vi.fn(async () => ({
    success: true,
    limit: 5,
    remaining: 5,
    reset: Date.now() + 60_000,
  })),
  checkApiRateLimit: vi.fn(async () => ({
    success: true,
    limit: 50,
    remaining: 50,
    reset: Date.now() + 60_000,
  })),
  getRateLimitHeaders: vi.fn(() => ({})),
};

const reportTypesMock = {
  REPORT_TYPES: new Proxy(
    {},
    {
      get: (_target, prop) => String(prop),
    },
  ),
};

const auditLogsQueryMock = {
  auditLogQuerySchema: {
    parse: vi.fn((input: Record<string, unknown>) => ({
      ...input,
      limit: input.limit ? Number(input.limit) : undefined,
      offset: input.offset ? Number(input.offset) : undefined,
      from: input.from ? new Date(String(input.from)) : undefined,
      to: input.to ? new Date(String(input.to)) : undefined,
    })),
  },
  buildAuditLogFilters: vi.fn(() => undefined),
  buildAuditEventFilters: vi.fn(() => undefined),
  auditEventMethodExpr: null,
  auditEventPathExpr: null,
  auditEventRequestIdExpr: null,
  auditEventStatusCodeExpr: null,
};

vi.mock('@/lib/audit', () => ({
  withAuditRoute: (_method: string, handler: any) => async (req: any, context: any) => {
    req.audit = { log: auditLogMock };
    return handler(req, context);
  },
  AuditEventType: new Proxy({}, { get: (_target, prop) => String(prop) }),
  AuditResourceType: new Proxy({}, { get: (_target, prop) => String(prop) }),
  computeDiff: vi.fn(() => ({
    changedFields: ['title'],
    diff: { title: { before: 'Old', after: 'New' } },
  })),
}));

vi.mock('@/app/lib/acx/withAuthz', () => ({
  withAuthz: (handler: any) => handler,
}));

vi.mock('@/app/lib/authz', () => authzMock);
vi.mock('@/app/lib/relegation-auth', () => relegationAuthMock);
vi.mock('@/app/api/v1/oc/_checks', () => ocChecksMock);
vi.mock('@/lib/authorization', () => authorizationMock);
vi.mock('@/lib/withRouteLogging', () => routeLoggingMock);
vi.mock('@/lib/ratelimit', () => rateLimitMock);
vi.mock('@/app/db/client', () => dbClientMock);
vi.mock('@/app/lib/reports/types', () => reportTypesMock);

vi.mock('argon2', () => {
  const hash = vi.fn(async () => 'hashed-password');
  const verify = vi.fn(async () => true);
  return {
    default: {
      hash,
      verify,
      argon2id: 2,
    },
    hash,
    verify,
    argon2id: 2,
  };
});

vi.mock('@/app/db/queries/academicGradingPolicy', () => genericModuleMock);
vi.mock('@/app/db/queries/appointment-transfer', () => genericModuleMock);
vi.mock('@/app/db/queries/appointments', () => genericModuleMock);
vi.mock('@/app/db/queries/courses', () => genericModuleMock);
vi.mock('@/app/db/queries/instructors', () => genericModuleMock);
vi.mock('@/app/db/queries/interviewOc', () => genericModuleMock);
vi.mock('@/app/db/queries/interviewTemplates', () => genericModuleMock);
vi.mock('@/app/db/queries/oc', () => genericModuleMock);
vi.mock('@/app/db/queries/offerings', () => genericModuleMock);
vi.mock('@/app/db/queries/olq', () => genericModuleMock);
vi.mock('@/app/db/queries/performance-graph', () => genericModuleMock);
vi.mock('@/app/db/queries/physicalTraining', () => genericModuleMock);
vi.mock('@/app/db/queries/physicalTrainingOc', () => genericModuleMock);
vi.mock('@/app/db/queries/platoon-commanders', () => genericModuleMock);
vi.mock('@/app/db/queries/punishments', () => genericModuleMock);
vi.mock('@/app/db/queries/rbac-admin', () => genericModuleMock);
vi.mock('@/app/db/queries/relegation', () => genericModuleMock);
vi.mock('@/app/db/queries/reportDownloadVersions', () => genericModuleMock);
vi.mock('@/app/db/queries/signupRequests', () => genericModuleMock);
vi.mock('@/app/db/queries/site-settings', () => genericModuleMock);
vi.mock('@/app/db/queries/trainingCamps', () => genericModuleMock);
vi.mock('@/app/db/queries/users', () => genericModuleMock);
vi.mock('@/app/services/academic-grading-recalculate', () => genericModuleMock);
vi.mock('@/app/lib/auditLogsQuery', () => auditLogsQueryMock);
vi.mock('@/app/lib/storage', () => genericModuleMock);
vi.mock('@/app/lib/reports/pdf/pdf-engine', () => genericModuleMock);
vi.mock('@/app/lib/reports/pdf/templates/consolidated-sessional', () => genericModuleMock);
vi.mock('@/app/lib/reports/pdf/templates/course-wise-final-performance', () => genericModuleMock);
vi.mock('@/app/lib/reports/pdf/templates/course-wise-performance', () => genericModuleMock);
vi.mock('@/app/lib/reports/pdf/templates/final-result-compilation', () => genericModuleMock);
vi.mock('@/app/lib/reports/pdf/templates/pt-assessment', () => genericModuleMock);
vi.mock('@/app/lib/reports/pdf/templates/semester-grade', () => genericModuleMock);
vi.mock('@/app/lib/reports/pdf/versioning', () => genericModuleMock);
vi.mock('@/app/lib/reports/pdf/zip', () => genericModuleMock);
vi.mock('@/app/lib/reports/report-data', () => genericModuleMock);
vi.mock('@/app/lib/reports/semester-resolution', () => genericModuleMock);
vi.mock('@/app/lib/reports/verification', () => genericModuleMock);
vi.mock('@/lib/interviewTemplateMatching', () => genericModuleMock);

vi.mock('@/app/lib/apiClient', () => schemaModuleMock);
vi.mock('@/app/lib/interview-oc-validators', () => schemaModuleMock);
vi.mock('@/app/lib/interview-template-validators', () => schemaModuleMock);
vi.mock('@/app/lib/oc-validators', () => schemaModuleMock);
vi.mock('@/app/lib/olq-validators', () => schemaModuleMock);
vi.mock('@/app/lib/physical-training-oc-validators', () => schemaModuleMock);
vi.mock('@/app/lib/physical-training-validators', () => schemaModuleMock);
vi.mock('@/app/lib/training-camp-validators', () => schemaModuleMock);
vi.mock('@/app/lib/validators', async (importOriginal) => importOriginal());
vi.mock('@/app/lib/validators.academic-grading-policy', () => schemaModuleMock);
vi.mock('@/app/lib/validators.courses', () => schemaModuleMock);
vi.mock('@/app/lib/validators.punishments', () => schemaModuleMock);
vi.mock('@/app/lib/validators.rbac', () => schemaModuleMock);
vi.mock('@/app/lib/validators.relegation', () => schemaModuleMock);
vi.mock('@/app/lib/validators.reports', () => schemaModuleMock);
vi.mock('@/app/lib/validators.site-settings', () => schemaModuleMock);

export function resetCommonMocks() {
  vi.clearAllMocks();
  genericModuleMock.__reset();
  schemaModuleMock.__reset();
  dbClientMock.__reset();

  authzMock.requireAuth.mockResolvedValue({
    userId: 'user-1',
    roles: ['ADMIN'],
    claims: {
      apt: {
        position: 'ADMIN',
        scope: {
          type: 'GLOBAL',
          id: null,
        },
      },
    },
  });
  authzMock.requireAdmin.mockResolvedValue({
    userId: 'admin-1',
    roles: ['ADMIN'],
    claims: {},
  });

  relegationAuthMock.getRelegationAccessContext.mockResolvedValue({
    userId: 'admin-1',
    roles: ['ADMIN'],
    isAdmin: true,
    isPlatoonCommander: false,
    canWriteSingle: true,
    canPromoteBatch: true,
    scopeType: null,
    scopeId: null,
    scopePlatoonId: null,
  });
  relegationAuthMock.assertCanWriteSingle.mockImplementation(() => undefined);
  relegationAuthMock.assertCanPromoteBatch.mockImplementation(() => undefined);

  ocChecksMock.mustBeAuthed.mockResolvedValue({ userId: 'user-1', roles: ['ADMIN'] });
  ocChecksMock.mustHaveOcAccess.mockResolvedValue({ userId: 'user-1', roles: ['ADMIN'] });
  ocChecksMock.mustBeAdmin.mockResolvedValue({ userId: 'admin-1', roles: ['ADMIN'] });
  ocChecksMock.mustBeAcademicsEditor.mockResolvedValue({ userId: 'admin-1', roles: ['ADMIN'] });
  ocChecksMock.assertOcSemesterWriteAllowed.mockResolvedValue(undefined);
  ocChecksMock.ensureOcExists.mockResolvedValue(undefined);
  ocChecksMock.parseParam.mockImplementation(async ({ params }: any, schema: any) => {
    const resolvedParams = await params;
    return schema?.parse ? schema.parse(resolvedParams) : resolvedParams;
  });

  authorizationMock.authorizeOcAccess.mockResolvedValue(undefined);
}

export function forceAuthFailure(status = 401) {
  const error = new ApiError(
    status,
    status === 403 ? 'Forbidden' : 'Unauthorized',
    status === 403 ? 'forbidden' : 'unauthorized',
  );
  authzMock.requireAuth.mockRejectedValueOnce(error);
  authzMock.requireAdmin.mockRejectedValueOnce(error);
  relegationAuthMock.getRelegationAccessContext.mockRejectedValueOnce(error);
  ocChecksMock.mustBeAuthed.mockRejectedValueOnce(error);
  ocChecksMock.mustHaveOcAccess.mockRejectedValueOnce(error);
  ocChecksMock.mustBeAdmin.mockRejectedValueOnce(error);
  ocChecksMock.mustBeAcademicsEditor.mockRejectedValueOnce(error);
  authorizationMock.authorizeOcAccess.mockRejectedValueOnce(error);
}
