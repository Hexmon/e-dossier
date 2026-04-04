import { ApiError } from '@/app/lib/http';
import { vi } from 'vitest';

const UUIDS = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
];

function makeGenericRecord() {
  return {
    id: UUIDS[0],
    userId: UUIDS[1],
    courseId: UUIDS[2],
    offeringId: UUIDS[3],
    historyId: UUIDS[4],
    categoryId: UUIDS[1],
    subtitleId: UUIDS[2],
    templateId: UUIDS[3],
    fieldId: UUIDS[4],
    groupId: UUIDS[1],
    sectionId: UUIDS[2],
    courseCode: 'TES-50',
    courseName: 'TES 50',
    course: {
      id: UUIDS[2],
      code: 'TES-50',
      name: 'TES 50',
      allowedSemesters: [1, 2, 3, 4, 5, 6],
    },
    subject: {
      id: UUIDS[3],
      code: 'SUBJ-1',
      name: 'Subject',
      instructorName: 'Instructor One',
    },
    ocId: UUIDS[0],
    ocNo: 'OC-001',
    ocName: 'Officer Cadet',
    name: 'Test Name',
    title: 'Test Title',
    code: 'CODE',
    key: 'KEY',
    label: 'Label',
    description: 'Valid test description',
    subtitles: [{ id: UUIDS[2], subtitle: 'Subtitle', maxMarks: 10 }],
    categories: [{ id: UUIDS[1], title: 'Category', subtitles: [{ id: UUIDS[2] }] }],
    semesters: [1],
    items: [],
    before: { id: UUIDS[0] },
    after: { id: UUIDS[0] },
    oc: {
      ocId: UUIDS[0],
      ocNo: 'OC-001',
      ocName: 'Officer Cadet',
      name: 'Officer Cadet',
    },
    status: 'AUTHENTIC_CODE_ONLY',
    verificationStatus: 'AUTHENTIC_CODE_ONLY',
    overallVerdict: 'AUTHENTIC_CODE_ONLY',
    codeStatus: 'FOUND',
    fileStatus: 'NOT_PROVIDED',
    summary: {},
    theoryRows: [],
    practicalRows: [],
    candidates: [],
    fromCourse: {
      courseId: UUIDS[1],
      courseCode: 'TES-50',
      courseName: 'TES 50',
    },
    toCourse: {
      courseId: UUIDS[2],
      courseCode: 'TES-51',
      courseName: 'TES 51',
    },
    history: {
      id: UUIDS[3],
      performedAt: new Date().toISOString(),
    },
    allowedSemesters: [1, 2, 3, 4, 5, 6],
    buffer: Buffer.from('pdf'),
    checksumSha256: 'checksum',
    fileName: 'report.pdf',
    versionId: 'RPT-0001',
    createdAt: new Date(),
    occurredAt: new Date(),
    uploadUrl: 'https://upload.example.test',
    publicUrl: 'https://public.example.test/file.pdf',
    objectKey: 'uploads/file.pdf',
    encrypted: true,
    overallPredictiveRating: 4,
    scopeOfImprovement: 'Improve observation',
    ptType: {
      id: UUIDS[1],
      code: 'PT-A',
      name: 'Assessment A',
    },
    columns: [{ key: 'total', label: 'Total' }],
    maxTotalForSemester: 100,
    subjectColumns: [{ key: 'subj-1', label: 'Subject 1' }],
    rows: [{ ocId: UUIDS[0], total: 80 }],
    positives: [{ note: 'Good awareness', by: 'Assessor' }],
    negatives: [{ note: 'Needs work', by: 'Assessor' }],
  };
}

function makeThenableChain(result: unknown) {
  const target: Record<string, any> = {
    then(onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
      return Promise.resolve(result).then(onFulfilled, onRejected);
    },
  };

  const proxy = new Proxy(target, {
    get(target, prop) {
      if (prop in target) return target[prop as keyof typeof target];
      return () => proxy;
    },
  });

  return proxy;
}

export function createDbMock() {
  const selectResult = [makeGenericRecord()];
  const mutationResult = [makeGenericRecord()];
  const db = {
    select: vi.fn(() => makeThenableChain(selectResult)),
    insert: vi.fn(() => makeThenableChain(mutationResult)),
    update: vi.fn(() => makeThenableChain(mutationResult)),
    delete: vi.fn(() => makeThenableChain(mutationResult)),
    execute: vi.fn(async () => mutationResult),
  };

  return {
    db,
    __reset() {
      Object.values(db).forEach((mockFn) => {
        if (typeof mockFn === 'function' && 'mockReset' in mockFn) {
          (mockFn as ReturnType<typeof vi.fn>).mockReset();
        }
      });
      db.select.mockImplementation(() => makeThenableChain(selectResult));
      db.insert.mockImplementation(() => makeThenableChain(mutationResult));
      db.update.mockImplementation(() => makeThenableChain(mutationResult));
      db.delete.mockImplementation(() => makeThenableChain(mutationResult));
      db.execute.mockResolvedValue(mutationResult);
    },
  };
}

function defaultAsyncValue(name: string): unknown {
  if (name === 'generateReportVersionId') return 'RPT-0001';
  if (name === 'sanitizePdfFileName') return 'report.pdf';
  if (name === 'getPublicObjectUrl') return 'https://public.example.test/file.pdf';
  if (name === 'createPresignedUploadUrl') return 'https://upload.example.test';
  if (name === 'getStorageConfig') return { bucket: 'test-bucket' };
  if (name === 'headObject') {
    return {
      ContentLength: 64 * 1024,
      ContentType: 'image/webp',
      ETag: '"etag-123"',
    };
  }
  if (name === 'buildZipBuffer') return Buffer.from('zip');
  if (name === 'computeDiff') {
    return {
      changedFields: ['title'],
      diff: { title: { before: 'Old', after: 'New' } },
    };
  }
  if (name === 'renderEncryptedPdf') {
    return {
      buffer: Buffer.from('pdf'),
      checksumSha256: 'checksum',
    };
  }
  if (name === 'buildTemplateMappings') {
    return { templates: [makeGenericRecord()] };
  }
  if (name === 'getTemplateMatchForSemester') {
    return {
      template: {
        id: UUIDS[3],
        semesters: [1, 2, 3, 4, 5, 6],
      },
    };
  }
  if (name === 'transferAppointment') {
    return {
      ended: {
        id: UUIDS[0],
        userId: UUIDS[1],
        positionId: UUIDS[2],
        scopeType: 'GLOBAL',
        scopeId: null,
      },
      next: {
        id: UUIDS[3],
        userId: UUIDS[4],
        positionId: UUIDS[2],
        scopeType: 'GLOBAL',
        scopeId: null,
      },
      audit: {
        id: UUIDS[2],
        createdAt: new Date().toISOString(),
      },
      adjustedPrevEndsAt: null,
    };
  }
  if (name === 'buildFinalResultCompilationPreview') {
    return {
      course: {
        id: UUIDS[2],
        code: 'TES-50',
        name: 'TES 50',
      },
      subjectColumns: [{ key: 'subject-1', label: 'Subject 1' }],
      rows: [{ ocId: UUIDS[0], total: 82 }],
    };
  }
  if (name === 'buildPtAssessmentPreview') {
    return {
      course: {
        id: UUIDS[2],
        code: 'TES-50',
        name: 'TES 50',
      },
      selection: {
        ptTypeId: UUIDS[1],
        label: 'PT-A - Assessment A',
        isAll: false,
      },
      sections: [
        {
          ptType: {
            id: UUIDS[1],
            code: 'PT-A',
            title: 'Assessment A',
          },
          tasks: [{ taskId: 'task-1', title: 'Run', maxMarks: 20 }],
          rows: [
            {
              ocId: UUIDS[0],
              sNo: 1,
              tesNo: 'TES-1',
              rank: 'OC',
              name: 'Cadet One',
              cells: {
                'task-1': { attemptCode: 'A1/C1', gradeCode: 'E/G/S', marks: 82 },
              },
              totalMarksScored: 82,
            },
          ],
        },
      ],
    };
  }
  if (name === 'getDossierSnapshotView') {
    return {
      arrivalPhoto: null,
      departurePhoto: null,
      tesNo: 'OC-001',
      name: 'Officer Cadet',
      course: 'TES-50',
      pi: 'ARJUN',
      dtOfArr: '2026-01-01',
      relegated: '',
      withdrawnOn: '',
      dtOfPassingOut: '',
      icNo: '',
      orderOfMerit: '',
      regtArm: '',
      postedAtt: '',
    };
  }
  if (name === 'getDossierFillingView') {
    return {
      initiatedBy: '',
      openedOn: '',
      initialInterview: '',
      closedBy: '',
      closedOn: '',
      finalInterview: '',
    };
  }
  if (name === 'getAutobiographyView') {
    return {
      generalSelf: '',
      proficiencySports: '',
      achievementsNote: '',
      areasToWork: '',
      additionalInfo: '',
      filledOn: '',
      platoonCommanderName: '',
    };
  }
  if (name === 'getSsbReportView') {
    return {
      positives: [],
      negatives: [],
      predictiveRating: 0,
      scopeForImprovement: '',
    };
  }
  if (name === 'buildCourseWisePerformancePreview') {
    return {
      course: {
        id: UUIDS[2],
        code: 'TES-50',
        name: 'TES 50',
      },
      columns: [{ key: 'subject-1', label: 'Subject 1' }],
      rows: [{ ocId: UUIDS[0], total: 82 }],
      maxTotalForSemester: 100,
    };
  }
  if (name === 'listMotivationFieldsByIds') {
    return [
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        semester: 1,
        deletedAt: null,
        isActive: true,
      },
    ];
  }
  if (name === 'listTemplateScoresByIds') {
    return [
      {
        ptTaskScoreId: '21212121-2121-4121-8121-212121212121',
        semester: 1,
        maxMarks: 100,
        typeDeletedAt: null,
        taskDeletedAt: null,
        attemptDeletedAt: null,
        gradeDeletedAt: null,
        typeIsActive: true,
        attemptIsActive: true,
        gradeIsActive: true,
      },
    ];
  }
  if (
    name === 'deleteOcPtMotivationValuesByIds' ||
    name === 'deleteOcPtMotivationValuesBySemester' ||
    name === 'deleteOcPtScoresByIds' ||
    name === 'deleteOcPtScoresBySemester'
  ) {
    return [{ id: UUIDS[0] }];
  }
  if (name.startsWith('list') || name.endsWith('Categories') || name.endsWith('Subtitles')) {
    return [makeGenericRecord()];
  }
  if (name.startsWith('get') || name.startsWith('create') || name.startsWith('update') || name.startsWith('upsert')) {
    return makeGenericRecord();
  }
  if (name.startsWith('delete')) {
    return {
      id: UUIDS[0],
      before: { id: UUIDS[0] },
      after: { id: UUIDS[0] },
    };
  }
  if (name.startsWith('copy') || name.startsWith('apply') || name.startsWith('recompute')) {
    return makeGenericRecord();
  }
  if (name.startsWith('resolve')) {
    return {
      ...makeGenericRecord(),
      allowedSemesters: [1, 2, 3, 4, 5, 6],
      code: 'TES-50',
    };
  }
  if (name.startsWith('build')) {
    return makeGenericRecord();
  }
  return makeGenericRecord();
}

export function createAsyncModuleMock() {
  const mocks = new Map<string, ReturnType<typeof vi.fn>>();
  const target: Record<string, unknown> = {};
  const RESERVED_PROPS = new Set(['then', 'catch', 'finally']);

  const module = new Proxy(
    target,
    {
      get(target, prop) {
        if (typeof prop === 'string' && RESERVED_PROPS.has(prop)) return undefined;
        if (prop === '__esModule') return true;
        if (prop === '__reset') {
          return () => {
            for (const mockFn of mocks.values()) {
              mockFn.mockReset();
            }
            mocks.clear();
            for (const key of Object.keys(target)) {
              delete target[key];
            }
          };
        }
        if (prop === '__getMock') {
          return (name: string) => {
            const existing = mocks.get(name);
            if (existing) return existing;
            const mockFn = vi.fn(() => defaultAsyncValue(name));
            mocks.set(name, mockFn);
            target[name] = mockFn;
            return mockFn;
          };
        }

        const name = String(prop);
        if (!mocks.has(name)) {
          const mockFn = vi.fn(() => defaultAsyncValue(name));
          mocks.set(name, mockFn);
          target[name] = mockFn;
        }
        return mocks.get(name);
      },
      has(_target, prop) {
        if (typeof prop === 'string' && RESERVED_PROPS.has(prop)) return false;
        return typeof prop === 'string' ? true : prop in target;
      },
      ownKeys(target) {
        return Reflect.ownKeys(target);
      },
      getOwnPropertyDescriptor(target, prop) {
        if (!Reflect.has(target, prop)) {
          void (module as Record<string, unknown>)[String(prop)];
        }
        return {
          configurable: true,
          enumerable: true,
          writable: true,
          value: Reflect.get(target, prop),
        };
      },
    },
  ) as Record<string, unknown> & {
    __reset: () => void;
    __getMock: (name: string) => ReturnType<typeof vi.fn>;
  };

  return module;
}

function normalizeSchemaData(input: unknown) {
  if (input && typeof input === 'object') {
    return { ...input };
  }
  return input;
}

function validationFailure() {
  return {
    success: false as const,
    error: {
      flatten: () => ({
        formErrors: ['Validation failed.'],
        fieldErrors: {},
      }),
    },
  };
}

export function createSchemaModuleMock() {
  const schemas = new Map<string, { parse: ReturnType<typeof vi.fn>; safeParse: ReturnType<typeof vi.fn> }>();
  let forceFailure = false;
  const target: Record<string, unknown> = {};
  const RESERVED_PROPS = new Set(['then', 'catch', 'finally']);
  const CHAIN_METHODS = [
    'partial',
    'pick',
    'omit',
    'extend',
    'merge',
    'array',
    'optional',
    'nullable',
    'nullish',
    'default',
    'transform',
    'pipe',
    'passthrough',
    'strict',
    'strip',
  ];

  function ensureSchema(name: string) {
    if (!schemas.has(name)) {
      const parse = vi.fn((input: unknown) => {
        if (forceFailure) {
          throw new ApiError(400, 'Validation failed.', 'bad_request');
        }
        return normalizeSchemaData(input);
      });
      const safeParse = vi.fn((input: unknown) => {
        if (forceFailure) return validationFailure();
        return {
          success: true as const,
          data: normalizeSchemaData(input),
        };
      });

      const schema: Record<string, any> = { parse, safeParse };
      for (const method of CHAIN_METHODS) {
        schema[method] = vi.fn(() => schema);
      }
      schemas.set(name, schema);
      target[name] = schema;
    }

    return schemas.get(name);
  }

  return new Proxy(
    target,
    {
      get(target, prop) {
        if (typeof prop === 'string' && RESERVED_PROPS.has(prop)) return undefined;
        if (prop === '__esModule') return true;
        if (prop === '__setForceFailure') {
          return (value: boolean) => {
            forceFailure = value;
          };
        }
        if (prop === '__reset') {
          return () => {
            forceFailure = false;
            for (const schema of schemas.values()) {
              schema.parse.mockReset();
              schema.safeParse.mockReset();
            }
            schemas.clear();
            for (const key of Object.keys(target)) {
              delete target[key];
            }
          };
        }

        const name = String(prop);
        return ensureSchema(name);
      },
      has(_target, prop) {
        if (typeof prop === 'string' && RESERVED_PROPS.has(prop)) return false;
        return typeof prop === 'string' ? true : prop in target;
      },
      ownKeys(target) {
        return Reflect.ownKeys(target);
      },
      getOwnPropertyDescriptor(target, prop) {
        if (!Reflect.has(target, prop)) {
          ensureSchema(String(prop));
        }
        return {
          configurable: true,
          enumerable: true,
          writable: true,
          value: Reflect.get(target, prop),
        };
      },
    },
  ) as Record<string, unknown> & {
    __setForceFailure: (value: boolean) => void;
    __reset: () => void;
  };
}
