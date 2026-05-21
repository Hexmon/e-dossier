import { describe, expect, it } from 'vitest';
import type {
  PhysicalTrainingScore,
  PhysicalTrainingTemplateRow,
} from '@/hooks/usePhysicalTraining';
import {
  buildPTTableRows,
  buildPTUpdatePayloadFromRows,
  resolvePTTableRowAttemptChange,
} from '@/components/physic-training/ptTableHelpers';

const templateRows: PhysicalTrainingTemplateRow[] = [
  {
    ptTaskScoreId: 'score-a1',
    taskTitle: 'Run',
    maxMarks: 30,
    semester: 1,
    typeCode: 'PPT',
    typeTitle: 'PPT',
    attemptCode: 'CAT-A',
    gradeCode: 'G1',
  },
  {
    ptTaskScoreId: 'score-a2',
    taskTitle: 'Run',
    maxMarks: 25,
    semester: 1,
    typeCode: 'PPT',
    typeTitle: 'PPT',
    attemptCode: 'CAT-A',
    gradeCode: 'G2',
  },
  {
    ptTaskScoreId: 'score-b1',
    taskTitle: 'Run',
    maxMarks: 20,
    semester: 1,
    typeCode: 'PPT',
    typeTitle: 'PPT',
    attemptCode: 'CAT-B',
    gradeCode: 'G1',
  },
];

const savedScore: PhysicalTrainingScore = {
  id: 'saved-row-1',
  ptTaskScoreId: 'score-a2',
  marksScored: 19,
  attemptCode: 'CAT-A',
  gradeCode: 'G2',
};

describe('ptTableHelpers', () => {
  it('renders unsaved PT template rows as blank selections', () => {
    const [row] = buildPTTableRows(templateRows, 1, new Map());

    expect(row).toMatchObject({
      selectedAttempt: '',
      selectedGrade: '',
      selectedScoreId: '',
      column3: 0,
      column4: '',
      column5: '',
      column6: null,
    });
  });

  it('renders saved PT scores with their selected category, status, and marks', () => {
    const [row] = buildPTTableRows(templateRows, 1, new Map([[savedScore.ptTaskScoreId, savedScore]]));

    expect(row).toMatchObject({
      selectedAttempt: 'CAT-A',
      selectedGrade: 'G2',
      selectedScoreId: 'score-a2',
      column3: 25,
      column4: 'CAT-A',
      column5: 'G2',
      column6: 19,
      originalScoreRowId: 'saved-row-1',
      originalScoreId: 'score-a2',
      originalMarksScored: 19,
    });
  });

  it('does not build a save payload for untouched blank rows', () => {
    const rows = buildPTTableRows(templateRows, 1, new Map());

    expect(buildPTUpdatePayloadFromRows(rows)).toEqual({
      scores: [],
      deleteScoreIds: [],
    });
  });

  it('builds a delete payload when an existing saved mark is cleared', () => {
    const [row] = buildPTTableRows(templateRows, 1, new Map([[savedScore.ptTaskScoreId, savedScore]]));

    expect(buildPTUpdatePayloadFromRows([{ ...row, column6: null }])).toEqual({
      scores: [],
      deleteScoreIds: ['saved-row-1'],
    });
  });

  it('deletes the old row and upserts the new score when status selection changes', () => {
    const scoreById = new Map([[savedScore.ptTaskScoreId, savedScore]]);
    const [row] = buildPTTableRows(templateRows, 1, scoreById);
    const changed = resolvePTTableRowAttemptChange(row, 'CAT-B', scoreById);

    expect(buildPTUpdatePayloadFromRows([changed])).toEqual({
      scores: [
        {
          ptTaskScoreId: 'score-b1',
          marksScored: 20,
          attemptCode: 'CAT-B',
          gradeCode: 'G1',
        },
      ],
      deleteScoreIds: ['saved-row-1'],
    });
  });
});
