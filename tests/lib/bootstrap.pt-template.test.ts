import { beforeEach, describe, expect, it, vi } from 'vitest';

const fakeDb = vi.hoisted(() => {
  type Row = Record<string, any>;
  type Condition =
    | { kind: 'and'; conditions: Condition[] }
    | { kind: 'eq'; column: string; value: unknown }
    | { kind: 'isNull'; column: string };

  const tableNameSymbol = Symbol.for('drizzle:Name');
  const state: Record<string, Row[]> = {
    courses: [],
    pt_types: [],
    pt_type_attempts: [],
    pt_attempt_grades: [],
    pt_tasks: [],
    pt_task_scores: [],
    pt_motivation_award_fields: [],
  };
  const sequences: Record<string, number> = {};

  const columnToRowKey: Record<string, string> = {
    course_id: 'courseId',
    created_at: 'createdAt',
    deleted_at: 'deletedAt',
    is_active: 'isActive',
    is_compensatory: 'isCompensatory',
    max_marks: 'maxMarks',
    max_total_marks: 'maxTotalMarks',
    pt_attempt_grade_id: 'ptAttemptGradeId',
    pt_attempt_id: 'ptAttemptId',
    pt_task_id: 'ptTaskId',
    pt_type_id: 'ptTypeId',
    sort_order: 'sortOrder',
    updated_at: 'updatedAt',
  };

  function tableNameOf(table: any): string {
    return table?.[tableNameSymbol];
  }

  function columnNameOf(column: any): string {
    return column?.name;
  }

  function rowKey(columnName: string): string {
    return columnToRowKey[columnName] ?? columnName;
  }

  function readRowValue(row: Row, columnName: string): unknown {
    return row[rowKey(columnName)];
  }

  function matchesCondition(row: Row, condition?: Condition): boolean {
    if (!condition) return true;
    if (condition.kind === 'and') {
      return condition.conditions.every((item) => matchesCondition(row, item));
    }
    if (condition.kind === 'eq') {
      return readRowValue(row, condition.column) === condition.value;
    }
    if (condition.kind === 'isNull') {
      return readRowValue(row, condition.column) == null;
    }
    return false;
  }

  function projectRow(row: Row, projection?: Record<string, any>): Row {
    if (!projection) return { ...row };
    return Object.fromEntries(
      Object.entries(projection).map(([key, column]) => [
        key,
        row[key] ?? readRowValue(row, columnNameOf(column)),
      ])
    );
  }

  function nextId(tableName: string): string {
    sequences[tableName] = (sequences[tableName] ?? 0) + 1;
    return `${tableName}-${sequences[tableName]}`;
  }

  function insertRows(tableName: string, values: Row | Row[]): Row[] {
    const rows = Array.isArray(values) ? values : [values];
    return rows.map((value) => {
      const row = { ...value, id: value.id ?? nextId(tableName) };
      state[tableName].push(row);
      return row;
    });
  }

  function select(projection?: Record<string, any>) {
    let tableName = '';
    let condition: Condition | undefined;
    const builder = {
      from(table: any) {
        tableName = tableNameOf(table);
        return builder;
      },
      where(nextCondition: Condition) {
        condition = nextCondition;
        return builder;
      },
      async limit(count: number) {
        return state[tableName]
          .filter((row) => matchesCondition(row, condition))
          .slice(0, count)
          .map((row) => projectRow(row, projection));
      },
    };
    return builder;
  }

  function insert(table: any) {
    const tableName = tableNameOf(table);
    return {
      values(values: Row | Row[]) {
        const inserted = insertRows(tableName, values);
        return {
          async returning(projection?: Record<string, any>) {
            return inserted.map((row) => projectRow(row, projection));
          },
        };
      },
    };
  }

  function update(table: any) {
    const tableName = tableNameOf(table);
    return {
      set(patch: Row) {
        return {
          async where(condition: Condition) {
            for (const row of state[tableName]) {
              if (matchesCondition(row, condition)) {
                Object.assign(row, patch);
              }
            }
          },
        };
      },
    };
  }

  function snapshot(): Record<string, Row[]> {
    return Object.fromEntries(
      Object.entries(state).map(([tableName, rows]) => [
        tableName,
        rows.map((row) => ({ ...row })),
      ])
    );
  }

  function restore(snapshotState: Record<string, Row[]>): void {
    for (const tableName of Object.keys(state)) {
      state[tableName] = snapshotState[tableName].map((row) => ({ ...row }));
    }
  }

  async function transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    const before = snapshot();
    try {
      return await callback(db);
    } catch (error) {
      restore(before);
      throw error;
    }
  }

  const db = {
    select: vi.fn(select),
    insert: vi.fn(insert),
    update: vi.fn(update),
    transaction: vi.fn(transaction),
  };

  function reset() {
    for (const tableName of Object.keys(state)) {
      state[tableName] = [];
      sequences[tableName] = 0;
    }
    vi.clearAllMocks();
    db.select.mockImplementation(select);
    db.insert.mockImplementation(insert);
    db.update.mockImplementation(update);
    db.transaction.mockImplementation(transaction);
  }

  function seedCourse(id: string) {
    state.courses.push({
      id,
      code: `COURSE-${state.courses.length + 1}`,
      title: `Course ${state.courses.length + 1}`,
    });
  }

  return {
    db,
    state,
    reset,
    seedCourse,
    eq: (column: any, value: unknown): Condition => ({
      kind: 'eq',
      column: columnNameOf(column),
      value,
    }),
    and: (...conditions: Condition[]): Condition => ({ kind: 'and', conditions }),
    isNull: (column: any): Condition => ({
      kind: 'isNull',
      column: columnNameOf(column),
    }),
  };
});

vi.mock('drizzle-orm', async (importActual) => {
  const actual = await importActual<typeof import('drizzle-orm')>();
  return {
    ...actual,
    and: fakeDb.and,
    eq: fakeDb.eq,
    isNull: fakeDb.isNull,
  };
});

vi.mock('@/app/db/client', () => ({
  db: fakeDb.db,
}));

import {
  applyPtTemplateProfile,
  getPtTemplatePack,
} from '@/app/lib/bootstrap/pt-template';
import type {
  PtTemplateApplyStats,
  PtTemplatePack,
} from '@/app/lib/bootstrap/types';

const COURSE_ID = '11111111-1111-4111-8111-111111111111';

function addStats(target: PtTemplateApplyStats, amount = 1): void {
  target.created += amount;
}

function countTemplatePack(pack: PtTemplatePack) {
  const stats = {
    ptTypes: { created: 0, updated: 0, skipped: 0 },
    attempts: { created: 0, updated: 0, skipped: 0 },
    grades: { created: 0, updated: 0, skipped: 0 },
    tasks: { created: 0, updated: 0, skipped: 0 },
    taskScores: { created: 0, updated: 0, skipped: 0 },
    motivationFields: { created: 0, updated: 0, skipped: 0 },
  };

  for (const semester of pack.semesters) {
    addStats(stats.motivationFields, semester.motivationFields.length);
    for (const ptType of semester.ptTypes) {
      addStats(stats.ptTypes);
      addStats(stats.attempts, ptType.attempts.length);
      addStats(stats.tasks, ptType.tasks.length);
      for (const attempt of ptType.attempts) {
        addStats(stats.grades, attempt.grades.length);
      }
      for (const task of ptType.tasks) {
        addStats(stats.taskScores, task.scoreMatrix.length);
      }
    }
  }

  const total = Object.values(stats).reduce((sum, item) => sum + item.created, 0);
  return { stats, total };
}

describe('PT template pack', () => {
  beforeEach(() => {
    fakeDb.reset();
  });

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

describe('applyPtTemplateProfile', () => {
  beforeEach(() => {
    fakeDb.reset();
  });

  it('keeps legacy global apply behavior when no course is selected', async () => {
    const expected = countTemplatePack(getPtTemplatePack('default'));

    const result = await applyPtTemplateProfile({ profile: 'default', dryRun: false });

    expect(result.courseId).toBeNull();
    expect(result.createdCount).toBe(expected.total);
    expect(result.updatedCount).toBe(0);
    expect(result.skippedCount).toBe(0);
    expect(result.stats).toEqual(expected.stats);
    expect(fakeDb.state.pt_types).toHaveLength(expected.stats.ptTypes.created);
    expect(fakeDb.state.pt_motivation_award_fields).toHaveLength(
      expected.stats.motivationFields.created
    );
    expect(fakeDb.state.pt_types.every((row) => row.courseId === null)).toBe(true);
    expect(fakeDb.state.pt_motivation_award_fields.every((row) => row.courseId === null)).toBe(true);
  });

  it('creates course-scoped editable PT rows when a selected course is supplied', async () => {
    fakeDb.seedCourse(COURSE_ID);
    const expected = countTemplatePack(getPtTemplatePack('default'));

    const result = await applyPtTemplateProfile({
      profile: 'default',
      dryRun: false,
      courseId: COURSE_ID,
    });

    expect(result.courseId).toBe(COURSE_ID);
    expect(result.createdCount).toBe(expected.total);
    expect(result.updatedCount).toBe(0);
    expect(result.skippedCount).toBe(0);
    expect(fakeDb.state.pt_types).toHaveLength(expected.stats.ptTypes.created);
    expect(fakeDb.state.pt_motivation_award_fields).toHaveLength(
      expected.stats.motivationFields.created
    );
    expect(fakeDb.state.pt_types.every((row) => row.courseId === COURSE_ID)).toBe(true);
    expect(fakeDb.state.pt_motivation_award_fields.every((row) => row.courseId === COURSE_ID)).toBe(true);
  });

  it('does not reuse legacy global PT rows when applying defaults to a selected course', async () => {
    const expected = countTemplatePack(getPtTemplatePack('default'));
    await applyPtTemplateProfile({ profile: 'default', dryRun: false });
    fakeDb.seedCourse(COURSE_ID);

    const courseResult = await applyPtTemplateProfile({
      profile: 'default',
      dryRun: false,
      courseId: COURSE_ID,
    });

    expect(courseResult.createdCount).toBe(expected.total);
    expect(courseResult.updatedCount).toBe(0);
    expect(courseResult.skippedCount).toBe(0);
    expect(fakeDb.state.pt_types.filter((row) => row.courseId === null)).toHaveLength(
      expected.stats.ptTypes.created
    );
    expect(fakeDb.state.pt_types.filter((row) => row.courseId === COURSE_ID)).toHaveLength(
      expected.stats.ptTypes.created
    );
    expect(
      fakeDb.state.pt_motivation_award_fields.filter((row) => row.courseId === null)
    ).toHaveLength(expected.stats.motivationFields.created);
    expect(
      fakeDb.state.pt_motivation_award_fields.filter((row) => row.courseId === COURSE_ID)
    ).toHaveLength(expected.stats.motivationFields.created);
  });

  it('is idempotent for the same selected course', async () => {
    const expected = countTemplatePack(getPtTemplatePack('default'));
    fakeDb.seedCourse(COURSE_ID);
    await applyPtTemplateProfile({ profile: 'default', dryRun: false, courseId: COURSE_ID });

    const secondResult = await applyPtTemplateProfile({
      profile: 'default',
      dryRun: false,
      courseId: COURSE_ID,
    });

    expect(secondResult.createdCount).toBe(0);
    expect(secondResult.updatedCount).toBe(0);
    expect(secondResult.skippedCount).toBe(expected.total);
    expect(fakeDb.state.pt_types).toHaveLength(expected.stats.ptTypes.created);
    expect(fakeDb.state.pt_motivation_award_fields).toHaveLength(
      expected.stats.motivationFields.created
    );
  });

  it('rolls back course-scoped inserts during dry-run preview', async () => {
    fakeDb.seedCourse(COURSE_ID);
    const expected = countTemplatePack(getPtTemplatePack('default'));

    const result = await applyPtTemplateProfile({
      profile: 'default',
      dryRun: true,
      courseId: COURSE_ID,
    });

    expect(result.courseId).toBe(COURSE_ID);
    expect(result.dryRun).toBe(true);
    expect(result.createdCount).toBe(expected.total);
    expect(fakeDb.state.pt_types).toHaveLength(0);
    expect(fakeDb.state.pt_type_attempts).toHaveLength(0);
    expect(fakeDb.state.pt_attempt_grades).toHaveLength(0);
    expect(fakeDb.state.pt_tasks).toHaveLength(0);
    expect(fakeDb.state.pt_task_scores).toHaveLength(0);
    expect(fakeDb.state.pt_motivation_award_fields).toHaveLength(0);
  });

  it('rejects a selected course that does not exist before writing template rows', async () => {
    await expect(
      applyPtTemplateProfile({
        profile: 'default',
        dryRun: false,
        courseId: COURSE_ID,
      })
    ).rejects.toThrow(`Course "${COURSE_ID}" does not exist.`);

    expect(fakeDb.state.pt_types).toHaveLength(0);
    expect(fakeDb.state.pt_type_attempts).toHaveLength(0);
    expect(fakeDb.state.pt_attempt_grades).toHaveLength(0);
    expect(fakeDb.state.pt_tasks).toHaveLength(0);
    expect(fakeDb.state.pt_task_scores).toHaveLength(0);
    expect(fakeDb.state.pt_motivation_award_fields).toHaveLength(0);
    expect(fakeDb.db.transaction).not.toHaveBeenCalled();
  });
});
