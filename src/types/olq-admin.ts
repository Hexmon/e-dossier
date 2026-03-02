export interface OlqAdminSubtitle {
  id: string;
  categoryId: string;
  subtitle: string;
  maxMarks: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OlqAdminCategory {
  id: string;
  courseId: string | null;
  code: string;
  title: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  subtitles?: OlqAdminSubtitle[];
}

export interface OlqAdminCategoryCreateInput {
  code: string;
  title: string;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export interface OlqAdminCategoryUpdateInput {
  code?: string;
  title?: string;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export interface OlqAdminSubtitleCreateInput {
  categoryId: string;
  subtitle: string;
  maxMarks?: number;
  displayOrder?: number;
  isActive?: boolean;
}

export interface OlqAdminSubtitleUpdateInput {
  categoryId?: string;
  subtitle?: string;
  maxMarks?: number;
  displayOrder?: number;
  isActive?: boolean;
}

export interface OlqAdminCategoryListResponse {
  message: string;
  items: OlqAdminCategory[];
  count: number;
}

export interface OlqAdminSubtitleListResponse {
  message: string;
  items: OlqAdminSubtitle[];
  count: number;
}

export interface OlqAdminCategoryResponse {
  message: string;
  category: OlqAdminCategory;
}

export interface OlqAdminSubtitleResponse {
  message: string;
  subtitle: OlqAdminSubtitle;
}

export interface OlqAdminDeleteResponse {
  message: string;
  deleted: string;
  hardDeleted: boolean;
}

export interface OlqAdminCopyTemplateInput {
  sourceCourseId: string;
  mode: "replace";
}

export interface OlqAdminCopyTemplateResponse {
  message: string;
  sourceCourseId: string;
  targetCourseId: string;
  categoriesCopied: number;
  subtitlesCopied: number;
  mode: "replace";
}

export type OlqTemplateApplyScope = "course" | "all";
export type OlqTemplateApplyMode = "replace" | "upsert_missing";

export interface OlqTemplateApplyRequest {
  scope: OlqTemplateApplyScope;
  courseId?: string;
  dryRun?: boolean;
  mode?: OlqTemplateApplyMode;
}

export interface OlqTemplateApplyCourseResult {
  courseId: string;
  status: "ok" | "error";
  categoriesCreated: number;
  categoriesUpdated: number;
  categoriesSkipped: number;
  subtitlesCreated: number;
  subtitlesUpdated: number;
  subtitlesSkipped: number;
  warnings: string[];
  error?: string;
}

export interface OlqTemplateApplyResponse {
  message: string;
  scope: OlqTemplateApplyScope;
  dryRun: boolean;
  mode: OlqTemplateApplyMode;
  totalCourses: number;
  successCount: number;
  errorCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  results: OlqTemplateApplyCourseResult[];
}

export interface OlqDefaultTemplatePack {
  version: string;
  categories: Array<{
    code: string;
    title: string;
    description: string | null;
    displayOrder: number;
    subtitles: Array<{
      subtitle: string;
      maxMarks: number;
      displayOrder: number;
    }>;
  }>;
}
