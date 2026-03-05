"use client";

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllCourses } from '@/app/lib/api/courseApi';
import { useAcademicGradingPolicy } from '@/hooks/useAcademicGradingPolicy';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { GradePointBand, LetterGradeBand } from '@/app/lib/grading';
import type { AcademicGradingPolicyRecalculateResult } from '@/types/academic-grading-policy';

type ScopeMode = 'all' | 'courses';

function sortByMinMarksDesc<T extends { minMarks: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.minMarks - a.minMarks);
}

export default function ModuleMgmtGradingPolicyCard() {
  const {
    policy,
    loading,
    updatePolicy,
    previewChanges,
    applyChanges,
    isSavingPolicy,
    isRunningRecalculation,
  } = useAcademicGradingPolicy();

  const coursesQuery = useQuery({
    queryKey: ['grading-policy-courses'],
    queryFn: async () => {
      const response = await getAllCourses();
      return (response.items ?? []).filter((course) => !course.deleted_at);
    },
    staleTime: 60_000,
  });

  const [letterBands, setLetterBands] = useState<LetterGradeBand[]>([]);
  const [gradePointBands, setGradePointBands] = useState<GradePointBand[]>([]);
  const [sgpaFormulaTemplate, setSgpaFormulaTemplate] = useState<'CREDIT_WEIGHTED' | 'SEMESTER_AVG'>('CREDIT_WEIGHTED');
  const [cgpaFormulaTemplate, setCgpaFormulaTemplate] = useState<'CREDIT_WEIGHTED' | 'SEMESTER_AVG'>('CREDIT_WEIGHTED');
  const [roundingScale, setRoundingScale] = useState<number>(2);
  const [scope, setScope] = useState<ScopeMode>('all');
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [recalcResult, setRecalcResult] = useState<AcademicGradingPolicyRecalculateResult | null>(null);

  useEffect(() => {
    if (!policy) return;
    setLetterBands(sortByMinMarksDesc(policy.letterGradeBands));
    setGradePointBands(sortByMinMarksDesc(policy.gradePointBands));
    setSgpaFormulaTemplate(policy.sgpaFormulaTemplate);
    setCgpaFormulaTemplate(policy.cgpaFormulaTemplate);
    setRoundingScale(policy.roundingScale);
  }, [policy]);

  const courseOptions = useMemo(
    () =>
      [...(coursesQuery.data ?? [])].sort((a, b) => {
        const codeDiff = String(a.code ?? '').localeCompare(String(b.code ?? ''));
        if (codeDiff !== 0) return codeDiff;
        return String(a.title ?? '').localeCompare(String(b.title ?? ''));
      }),
    [coursesQuery.data]
  );

  const canRunScoped = scope === 'all' || selectedCourseIds.length > 0;

  const updateLetterBand = (index: number, field: keyof LetterGradeBand, value: string) => {
    setLetterBands((prev) =>
      prev.map((band, i) => {
        if (i !== index) return band;
        if (field === 'minMarks') {
          return { ...band, minMarks: Number.isFinite(Number(value)) ? Number(value) : 0 };
        }
        return { ...band, grade: value.toUpperCase() as LetterGradeBand['grade'] };
      })
    );
  };

  const updatePointBand = (index: number, field: keyof GradePointBand, value: string) => {
    setGradePointBands((prev) =>
      prev.map((band, i) => {
        if (i !== index) return band;
        if (field === 'minMarks') {
          return { ...band, minMarks: Number.isFinite(Number(value)) ? Number(value) : 0 };
        }
        return { ...band, points: Number.isFinite(Number(value)) ? Number(value) : 0 };
      })
    );
  };

  const toggleCourse = (courseId: string, checked: boolean) => {
    setSelectedCourseIds((prev) => {
      if (checked) return prev.includes(courseId) ? prev : [...prev, courseId];
      return prev.filter((id) => id !== courseId);
    });
  };

  const handleSavePolicy = async () => {
    await updatePolicy({
      letterGradeBands: sortByMinMarksDesc(letterBands),
      gradePointBands: sortByMinMarksDesc(gradePointBands),
      sgpaFormulaTemplate,
      cgpaFormulaTemplate,
      roundingScale,
    });
  };

  const handlePreview = async () => {
    const result = await previewChanges({
      scope,
      courseIds: scope === 'courses' ? selectedCourseIds : undefined,
    });
    setRecalcResult(result);
  };

  const handleApply = async () => {
    const result = await applyChanges({
      scope,
      courseIds: scope === 'courses' ? selectedCourseIds : undefined,
    });
    setRecalcResult(result);
  };

  if (loading && !policy) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Academic Grading Policy</CardTitle>
          <CardDescription>Loading policy...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Academic Grading Policy</CardTitle>
          <CardDescription>
            Configure global letter grade bands, grade point bands, and SGPA/CGPA formula settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <Label>Letter Grade Bands</Label>
              <div className="rounded-md border">
                <div className="grid grid-cols-2 gap-2 border-b bg-muted/40 px-3 py-2 text-sm font-medium">
                  <span>Minimum Marks</span>
                  <span>Letter Grade</span>
                </div>
                <div className="space-y-2 p-3">
                  {letterBands.map((band, index) => (
                    <div key={`${band.grade}-${index}`} className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        value={band.minMarks}
                        onChange={(event) => updateLetterBand(index, 'minMarks', event.target.value)}
                      />
                      <Input
                        value={band.grade}
                        onChange={(event) => updateLetterBand(index, 'grade', event.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Grade Point Bands</Label>
              <div className="rounded-md border">
                <div className="grid grid-cols-2 gap-2 border-b bg-muted/40 px-3 py-2 text-sm font-medium">
                  <span>Minimum Marks</span>
                  <span>Grade Points</span>
                </div>
                <div className="space-y-2 p-3">
                  {gradePointBands.map((band, index) => (
                    <div key={`${band.points}-${index}`} className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        value={band.minMarks}
                        onChange={(event) => updatePointBand(index, 'minMarks', event.target.value)}
                      />
                      <Input
                        type="number"
                        value={band.points}
                        onChange={(event) => updatePointBand(index, 'points', event.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>SGPA Formula</Label>
              <Select value={sgpaFormulaTemplate} onValueChange={(value) => setSgpaFormulaTemplate(value as typeof sgpaFormulaTemplate)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CREDIT_WEIGHTED">Credit Weighted</SelectItem>
                  <SelectItem value="SEMESTER_AVG">Semester Average</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>CGPA Formula</Label>
              <Select value={cgpaFormulaTemplate} onValueChange={(value) => setCgpaFormulaTemplate(value as typeof cgpaFormulaTemplate)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CREDIT_WEIGHTED">Credit Weighted</SelectItem>
                  <SelectItem value="SEMESTER_AVG">Semester Average</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rounding Scale</Label>
              <Input
                type="number"
                min={0}
                max={6}
                value={roundingScale}
                onChange={(event) => setRoundingScale(Number.isFinite(Number(event.target.value)) ? Number(event.target.value) : 2)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSavePolicy} disabled={isSavingPolicy}>
              {isSavingPolicy ? 'Saving...' : 'Save Policy'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recalculate Existing Data</CardTitle>
          <CardDescription>
            Preview and apply recalculation for grades, SGPA, and CGPA using the current policy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={scope} onValueChange={(value) => setScope(value as ScopeMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  <SelectItem value="courses">Selected Course(s)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {scope === 'courses' && (
            <div className="space-y-2">
              <Label>Select Courses</Label>
              <div className="max-h-44 space-y-2 overflow-y-auto rounded-md border p-3">
                {courseOptions.map((course) => {
                  const checked = selectedCourseIds.includes(course.id);
                  return (
                    <label key={course.id} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={checked} onCheckedChange={(value) => toggleCourse(course.id, Boolean(value))} />
                      <span>{course.code} - {course.title}</span>
                    </label>
                  );
                })}
                {!courseOptions.length && (
                  <p className="text-sm text-muted-foreground">
                    {coursesQuery.isLoading ? 'Loading courses...' : 'No courses found.'}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handlePreview} disabled={!canRunScoped || isRunningRecalculation}>
              {isRunningRecalculation ? 'Running...' : 'Preview Changes'}
            </Button>
            <Button onClick={handleApply} disabled={!canRunScoped || isRunningRecalculation}>
              {isRunningRecalculation ? 'Applying...' : 'Apply Updates'}
            </Button>
          </div>

          {recalcResult && (
            <div className="space-y-3 rounded-md border p-3">
              <p className="text-sm font-medium">
                Scope: {recalcResult.scope} | Dry Run: {recalcResult.dryRun ? 'Yes' : 'No'}
              </p>
              <div className="grid gap-2 text-sm md:grid-cols-3">
                <p>Scanned Rows: {recalcResult.scannedRows}</p>
                <p>Changed Rows: {recalcResult.changedRows}</p>
                <p>Changed Grade Fields: {recalcResult.changedGradeFields}</p>
                <p>Changed Summary Rows: {recalcResult.changedSummaryRows}</p>
                <p>Affected OCs: {recalcResult.affectedOcs}</p>
                <p>Affected Courses: {recalcResult.affectedCourses}</p>
              </div>

              {recalcResult.sampleChanges.length > 0 && (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="px-2 py-2 text-left">OC</th>
                        <th className="px-2 py-2 text-left">Course</th>
                        <th className="px-2 py-2 text-left">Semester</th>
                        <th className="px-2 py-2 text-left">Field</th>
                        <th className="px-2 py-2 text-left">Before</th>
                        <th className="px-2 py-2 text-left">After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recalcResult.sampleChanges.map((change, index) => (
                        <tr key={`${change.ocId}-${change.semester}-${change.field}-${index}`} className="border-t">
                          <td className="px-2 py-2">{change.ocId}</td>
                          <td className="px-2 py-2">{change.courseId}</td>
                          <td className="px-2 py-2">{change.semester}</td>
                          <td className="px-2 py-2">{change.field}</td>
                          <td className="px-2 py-2">{String(change.before ?? '')}</td>
                          <td className="px-2 py-2">{String(change.after ?? '')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
