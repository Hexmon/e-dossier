import { describe, expect, it } from 'vitest';
import type { PTTemplateType } from '@/app/lib/api/Physicaltrainingapi';
import type { PTBulkGetItem } from '@/app/lib/api/physicalTrainingBulkApi';
import {
  buildPTBulkInitialSelections,
  buildPTBulkTaskDefinitions,
  createPTBulkTaskSelection,
  getDefaultPTBulkTaskSelection,
} from '@/components/physic-training/bulk/ptBulkScoreHelpers';
import { buildBulkPTSaveRequest } from '@/hooks/usePhysicalTrainingBulk';

const ptType: PTTemplateType = {
  id: 'type-1',
  semester: 1,
  code: 'PPT',
  title: 'PPT',
  maxTotalMarks: 100,
  sortOrder: 1,
  isActive: true,
  attempts: [],
  tasks: [
    {
      id: 'task-1',
      ptTypeId: 'type-1',
      title: 'Run',
      maxMarks: 40,
      sortOrder: 1,
      attempts: [
        {
          id: 'attempt-a',
          code: 'CAT-A',
          grades: [
            { code: 'G1', maxMarks: 30, scoreId: 'score-a1' },
            { code: 'G2', maxMarks: 25, scoreId: 'score-a2' },
          ],
        },
        {
          id: 'attempt-b',
          code: 'CAT-B',
          grades: [
            { code: 'G1', maxMarks: 20, scoreId: 'score-b1' },
          ],
        },
      ],
    },
  ],
};

const bulkItem: PTBulkGetItem = {
  oc: {
    id: 'oc-1',
    ocNo: 'OC-01',
    name: 'OC One',
    branch: 'E',
    platoonId: null,
    platoonKey: null,
    platoonName: null,
  },
  scores: [
    {
      id: 'row-1',
      ocId: 'oc-1',
      semester: 1,
      ptTaskScoreId: 'score-a2',
      ptTaskId: 'task-1',
      marksScored: 19,
      remark: null,
      templateMaxMarks: 25,
      ptTypeCode: 'PPT',
      ptTypeTitle: 'PPT',
      taskTitle: 'Run',
      attemptCode: 'CAT-A',
      gradeCode: 'G2',
    },
  ],
  motivationValues: [],
};

describe('ptBulkScoreHelpers', () => {
  it('normalizes task options from a PT type', () => {
    const tasks = buildPTBulkTaskDefinitions(ptType);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].taskId).toBe('task-1');
    expect(tasks[0].attempts).toHaveLength(2);
    expect(tasks[0].attempts[0].grades.map((grade) => grade.scoreId)).toEqual(['score-a1', 'score-a2']);
  });

  it('derives initial selections from saved PT rows', () => {
    const tasks = buildPTBulkTaskDefinitions(ptType);
    const selections = buildPTBulkInitialSelections([bulkItem], tasks);

    expect(selections['oc-1']['task-1']).toEqual({
      taskId: 'task-1',
      selectedAttemptCode: 'CAT-A',
      selectedGradeCode: 'G2',
      selectedScoreId: 'score-a2',
      marks: '19',
      maxMarks: 25,
    });
  });

  it('uses the first configured attempt/grade as the default selection', () => {
    const task = buildPTBulkTaskDefinitions(ptType)[0];

    expect(getDefaultPTBulkTaskSelection(task)).toEqual({
      taskId: 'task-1',
      selectedAttemptCode: 'CAT-A',
      selectedGradeCode: 'G1',
      selectedScoreId: 'score-a1',
      marks: '30',
      maxMarks: 30,
    });
  });

  it('updates max marks when the selected status changes', () => {
    const task = buildPTBulkTaskDefinitions(ptType)[0];
    const selection = createPTBulkTaskSelection(task, 'CAT-B', 'G1');

    expect(selection?.selectedScoreId).toBe('score-b1');
    expect(selection?.maxMarks).toBe(20);
    expect(selection?.marks).toBe('20');
  });

  it('builds replacement payloads with clear + upsert when scoreId changes', () => {
    const payload = buildBulkPTSaveRequest({
      filters: {
        courseId: 'course-1',
        semester: 1,
        active: true,
        q: '',
        platoon: '',
      },
      data: {
        message: 'ok',
        template: {
          semester: 1,
          types: [ptType],
          motivationFields: [],
        },
        items: [bulkItem],
        count: 1,
        successCount: 1,
        errorCount: 0,
      },
      scoreDraftValues: {
        'oc-1': {
          'task-1': createPTBulkTaskSelection(buildPTBulkTaskDefinitions(ptType)[0], 'CAT-B', 'G1', '18')!,
        },
      },
      motivationDraftValues: {},
      clearScoreIds: {},
      clearMotivationFieldIds: {},
    });

    expect(payload?.items[0].scoresUpsert).toEqual([{ ptTaskScoreId: 'score-b1', marksScored: 18 }]);
    expect(payload?.items[0].clearScoreIds).toEqual(['score-a2']);
  });
});
