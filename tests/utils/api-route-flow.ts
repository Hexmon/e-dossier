import { makeJsonRequest } from './next';
import { routeTemplateFromFile, toPosix } from '../../scripts/lib/api-route-inventory';

const SAMPLE_PARAM_VALUES: Record<string, string> = {
  ocId: '11111111-1111-4111-8111-111111111111',
  id: '22222222-2222-4222-8222-222222222222',
  courseId: '33333333-3333-4333-8333-333333333333',
  offeringId: '44444444-4444-4444-8444-444444444444',
  templateId: '55555555-5555-4555-8555-555555555555',
  sectionId: '66666666-6666-4666-8666-666666666666',
  groupId: '77777777-7777-4777-8777-777777777777',
  fieldId: '88888888-8888-4888-8888-888888888888',
  optionId: '99999999-9999-4999-8999-999999999999',
  categoryId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  subtitleId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  historyId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  campId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  activityId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  courseOfferId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
  subjectId: '12121212-1212-4212-8212-121212121212',
  interviewId: '13131313-1313-4313-8313-131313131313',
  ruleId: '14141414-1414-4414-8414-141414141414',
  permissionId: '15151515-1515-4515-8515-151515151515',
  roleId: '16161616-1616-4616-8616-161616161616',
  typeId: '17171717-1717-4717-8717-171717171717',
  attemptId: '18181818-1818-4818-8818-181818181818',
  gradeId: '19191919-1919-4919-8919-191919191919',
  taskId: '20202020-2020-4020-8020-202020202020',
  scoreId: '21212121-2121-4121-8121-212121212121',
  idOrKey: 'ARJUN',
  semester: '1',
};

export const DEFAULT_REQUEST_BODY = {
  id: SAMPLE_PARAM_VALUES.id,
  userId: SAMPLE_PARAM_VALUES.id,
  ocId: SAMPLE_PARAM_VALUES.ocId,
  courseId: SAMPLE_PARAM_VALUES.courseId,
  currentCourseId: SAMPLE_PARAM_VALUES.courseId,
  sourceCourseId: SAMPLE_PARAM_VALUES.courseId,
  targetCourseId: SAMPLE_PARAM_VALUES.courseId,
  toCourseId: SAMPLE_PARAM_VALUES.courseId,
  courseOfferingId: SAMPLE_PARAM_VALUES.courseOfferId,
  subjectId: SAMPLE_PARAM_VALUES.subjectId,
  ptTypeId: SAMPLE_PARAM_VALUES.typeId,
  templateId: SAMPLE_PARAM_VALUES.templateId,
  fieldId: SAMPLE_PARAM_VALUES.fieldId,
  groupId: SAMPLE_PARAM_VALUES.groupId,
  sectionId: SAMPLE_PARAM_VALUES.sectionId,
  categoryId: SAMPLE_PARAM_VALUES.categoryId,
  subtitleId: SAMPLE_PARAM_VALUES.subtitleId,
  newUserId: SAMPLE_PARAM_VALUES.id,
  semester: 1,
  year: 2025,
  title: 'Test Title',
  name: 'Test Name',
  code: 'CODE',
  key: 'KEY',
  label: 'Label',
  username: 'testuser',
  email: 'test@example.com',
  phone: '+910000000000',
  rank: 'CAPT',
  designation: 'Commandant',
  tenure: '2025',
  displayName: 'Display Name',
  description: 'Valid test description',
  reason: 'Valid reason',
  remark: 'Valid remark',
  q: 'search',
  positionKey: 'ADMIN',
  platoonKey: 'ARJUN',
  scopeType: 'GLOBAL',
  scopeId: null,
  defaultScope: 'GLOBAL',
  singleton: true,
  isActive: true,
  includeDeleted: false,
  includeCategories: true,
  includeSubtitles: true,
  activeOnly: true,
  allowMultiple: true,
  kind: 'PROFILE',
  sortOrder: 0,
  startsAt: '2025-01-01T00:00:00.000Z',
  endsAt: '2025-12-31T00:00:00.000Z',
  newStartsAt: '2025-01-01T00:00:00.000Z',
  prevEndsAt: '2024-12-31T00:00:00.000Z',
  imageUrl: 'https://public.example.test/image.png',
  imageObjectKey: 'uploads/image.png',
  footer: 'Footer text',
  category: 'Category',
  location: 'Location',
  type: 'event',
  fileName: 'report.pdf',
  contentType: 'application/pdf',
  sizeBytes: 1024,
  password: 'password123',
  confirmPassword: 'password123',
  preparedBy: 'Prepared By',
  checkedBy: 'Checked By',
  orderedIds: [SAMPLE_PARAM_VALUES.id],
  ocIds: [SAMPLE_PARAM_VALUES.ocId],
  scores: [{
    subtitleId: SAMPLE_PARAM_VALUES.subtitleId,
    ptTaskScoreId: SAMPLE_PARAM_VALUES.scoreId,
    marksScored: 10,
  }],
  values: [{ fieldId: SAMPLE_PARAM_VALUES.categoryId, valueText: 'Motivation value' }],
  deleteSubtitleIds: [SAMPLE_PARAM_VALUES.subtitleId],
  fieldIds: [SAMPLE_PARAM_VALUES.categoryId],
  deleteFieldIds: [SAMPLE_PARAM_VALUES.categoryId],
  scoreIds: [SAMPLE_PARAM_VALUES.scoreId],
  deleteScoreIds: [SAMPLE_PARAM_VALUES.scoreId],
  positives: [{ note: 'Strong presence', by: 'Assessor' }],
  negatives: [{ note: 'Needs confidence', by: 'Assessor' }],
  predictiveRating: 4,
  scopeForImprovement: 'Improve confidence',
  pdfObjectKey: 'relegation/test.pdf',
  pdfUrl: 'https://public.example.test/relegation/test.pdf',
};

export function buildInvocationFromRouteFile(routeFile: string, query = '') {
  const template = routeTemplateFromFile(routeFile);
  const params: Record<string, string> = {};

  const pathName = template.replace(/\[([^\]]+)\]/g, (_match, paramName: string) => {
    const value = SAMPLE_PARAM_VALUES[paramName] ?? SAMPLE_PARAM_VALUES.id;
    params[paramName] = value;
    return value;
  });

  return {
    params,
    path: `${pathName}${query}`,
  };
}

const routeModuleImporters = import.meta.glob('../../src/app/api/v1/**/route.ts');
const routeModuleCache = new Map<string, Promise<Record<string, any>>>();

export async function importRouteModule(routeFile: string) {
  const cached = routeModuleCache.get(routeFile);
  if (cached) return cached;

  const importerKey = `../../${toPosix(routeFile)}`;
  const importer = routeModuleImporters[importerKey];
  if (!importer) {
    throw new Error(`No route importer registered for ${routeFile}`);
  }

  const promise = importer() as Promise<Record<string, any>>;
  routeModuleCache.set(routeFile, promise);
  return promise;
}

export async function preloadRouteModules(routeFiles: readonly string[]) {
  await Promise.all(routeFiles.map((routeFile) => importRouteModule(routeFile)));
}

export function makeRouteRequest(routeFile: string, method: string, query = '', body: Record<string, unknown> = DEFAULT_REQUEST_BODY) {
  const { path: requestPath, params } = buildInvocationFromRouteFile(routeFile, query);
  const req = makeJsonRequest({
    method,
    path: requestPath,
    body: method === 'GET' ? undefined : body,
  });

  return {
    req,
    params,
  };
}
