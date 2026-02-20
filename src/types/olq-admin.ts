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
