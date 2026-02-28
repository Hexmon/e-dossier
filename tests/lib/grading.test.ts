import { describe, expect, it } from 'vitest';
import { marksToGradePoints, marksToLetterGrade } from '@/app/lib/grading';

describe('grading utility', () => {
  it('maps marks to grade points with existing thresholds', () => {
    expect(marksToGradePoints(undefined)).toBe(0);
    expect(marksToGradePoints(null)).toBe(0);
    expect(marksToGradePoints(Number.NaN)).toBe(0);
    expect(marksToGradePoints(34)).toBe(0);
    expect(marksToGradePoints(35)).toBe(1);
    expect(marksToGradePoints(38)).toBe(2);
    expect(marksToGradePoints(41)).toBe(3);
    expect(marksToGradePoints(45)).toBe(4);
    expect(marksToGradePoints(50)).toBe(5);
    expect(marksToGradePoints(55)).toBe(6);
    expect(marksToGradePoints(60)).toBe(7);
    expect(marksToGradePoints(70)).toBe(8);
    expect(marksToGradePoints(80)).toBe(9);
  });

  it('maps marks to temporary letter grades', () => {
    expect(marksToLetterGrade(undefined)).toBe('F');
    expect(marksToLetterGrade(null)).toBe('F');
    expect(marksToLetterGrade(Number.NaN)).toBe('F');
    expect(marksToLetterGrade(34)).toBe('F');
    expect(marksToLetterGrade(35)).toBe('CM');
    expect(marksToLetterGrade(40)).toBe('CO');
    expect(marksToLetterGrade(45)).toBe('CP');
    expect(marksToLetterGrade(50)).toBe('BM');
    expect(marksToLetterGrade(55)).toBe('BO');
    expect(marksToLetterGrade(60)).toBe('BP');
    expect(marksToLetterGrade(70)).toBe('AM');
    expect(marksToLetterGrade(80)).toBe('AO');
    expect(marksToLetterGrade(90)).toBe('AP');
  });
});
