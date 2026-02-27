import { z } from 'zod';

const branchSchema = z.enum(['E', 'M', 'O']);

export const reportSemesterSchema = z.coerce.number().int().min(1).max(6);

const nonEmptyString = z.string().trim().min(1);

export const reportDownloadMetaSchema = z.object({
  password: z.string().min(1).max(128),
  preparedBy: z.string().trim().min(1).max(160),
  checkedBy: z.string().trim().min(1).max(160),
});

export const reportCourseSemesterMetadataQuerySchema = z.object({
  courseId: z.string().uuid(),
});

export const consolidatedSessionalPreviewQuerySchema = z.object({
  courseId: z.string().uuid(),
  semester: reportSemesterSchema,
  subjectId: z.string().uuid(),
});

export const consolidatedSessionalDownloadBodySchema = consolidatedSessionalPreviewQuerySchema.merge(
  reportDownloadMetaSchema
);

export const semesterGradeCandidatesQuerySchema = z.object({
  courseId: z.string().uuid(),
  semester: reportSemesterSchema,
  branches: z
    .preprocess((value) => {
      if (typeof value !== 'string') return [] as string[];
      return value
        .split(',')
        .map((v) => v.trim().toUpperCase())
        .filter(Boolean);
    }, z.array(branchSchema).optional().default([])),
  q: z.string().trim().max(120).optional(),
});

export const semesterGradePreviewQuerySchema = z.object({
  courseId: z.string().uuid(),
  semester: reportSemesterSchema,
});

export const semesterGradeDownloadBodySchema = z
  .object({
    courseId: z.string().uuid(),
    semester: reportSemesterSchema,
    ocIds: z.array(z.string().uuid()).min(1),
  })
  .merge(reportDownloadMetaSchema);

export const ptAssessmentPreviewQuerySchema = z.object({
  courseId: z.string().uuid(),
  semester: reportSemesterSchema,
  ptTypeId: z.string().uuid(),
});

export const ptAssessmentDownloadBodySchema = ptAssessmentPreviewQuerySchema.merge(
  reportDownloadMetaSchema
);

export const nonEmptySearchSchema = nonEmptyString.max(120);
