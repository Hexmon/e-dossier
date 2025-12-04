// types/training-camps.ts

import { z } from 'zod';
import {
  trainingCampCreateSchema,
  trainingCampUpdateSchema,
  trainingCampActivityCreateSchema,
  trainingCampActivityUpdateSchema,
} from '@/app/lib/training-camp-validators';

// Base Types
export type Semester = 'SEM5' | 'SEM6A' | 'SEM6B';  
export interface TrainingCamp {
  id: string;
  name: string;
  semester: Semester;
  maxTotalMarks: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface TrainingCampActivity {
  id: string;
  trainingCampId: string;
  name: string;
  defaultMaxMarks: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface TrainingCampWithActivities extends TrainingCamp {
  activities: TrainingCampActivity[];
}

// OC Camp Types
export type ReviewRole = 'OIC' | 'PLATOON_COMMANDER' | 'HOAT'; 

export interface OcCamp {
  id: string;
  ocId: string;
  trainingCampId: string;
  year: number;
  totalMarksScored: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  trainingCamp?: TrainingCamp;
  reviews?: OcCampReview[];
  activityScores?: OcCampActivityScore[];
}

export interface OcCampReview {
  id: string;
  ocCampId: string;
  role: ReviewRole;
  sectionTitle: string;
  reviewText: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OcCampActivityScore {
  id: string;
  ocCampId: string;
  trainingCampActivityId: string;
  marksScored: number;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
  activity?: TrainingCampActivity;
}

// Inferred Types from Zod schemas
export type CreateCampInput = z.infer<typeof trainingCampCreateSchema>;
export type UpdateCampInput = z.infer<typeof trainingCampUpdateSchema>;
export type CreateActivityInput = z.infer<typeof trainingCampActivityCreateSchema>;
export type UpdateActivityInput = z.infer<typeof trainingCampActivityUpdateSchema>;

// Query Params
export interface ListCampsParams {
  semester?: Semester;
  includeActivities?: boolean;
  includeDeleted?: boolean;
}

export interface ListActivitiesParams {
  includeDeleted?: boolean;
}

export interface GetCampParams {
  includeActivities?: boolean;
  includeDeleted?: boolean;
}

// OC Camp Input Types
export interface CreateOcCampReviewInput {
  role: ReviewRole;
  sectionTitle: string;
  reviewText: string;
}

export interface CreateOcCampActivityScoreInput {
  trainingCampActivityId: string;
  marksScored: number;
  remark?: string | null;
}

export interface UpsertOcCampInput {
  trainingCampId: string;
  year: number;
  reviews?: CreateOcCampReviewInput[];
  activities?: CreateOcCampActivityScoreInput[];
}

export interface UpdateOcCampInput extends UpsertOcCampInput {
  ocCampId?: string;
}

export interface OcCampQueryParams {
  semester?: Semester;
  campName?: string;
  withReviews?: boolean;
  withActivities?: boolean;
  reviewRole?: ReviewRole;
  activityName?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface ListCampsResponse {
  items: TrainingCamp[] | TrainingCampWithActivities[];
  count: number;
}

export interface ListActivitiesResponse {
  items: TrainingCampActivity[];
  count: number;
}

export interface OcCampsResponse {
  camps: OcCamp[];
  grandTotalMarksScored: number;
}
