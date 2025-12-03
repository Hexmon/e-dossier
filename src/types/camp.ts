// Type definitions for camps based on the API schema in src/app/api/v1/oc/[ocId]/camps/route.ts

export type CampReview = {
  id: string;
  role: string;
  sectionTitle: string;
  reviewText: string;
};

export type CampActivity = {
  id: string;
  trainingCampActivityId: string;
  name: string;
  maxMarks: number;
  marksScored: number;
  remark?: string | null;
};

export type CampRow = {
  id: string;
  ocId: string;
  trainingCampId?: string;
  year: number;
  reviews?: CampReview[];
  activities?: CampActivity[];
  totalMarksScored?: number;
};

export type CampFormValues = {
  campRows: CampRow[];
  grandTotalMarksScored?: number;
  reviews: {
    oic: string;
    basicDs: string;
    piCdr: string;
  };
};

export type OcCamp = {
  id: string;
  ocId: string;
  trainingCampId: string;
  year: number;
  totalMarksScored?: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export type OcCampWithReviewsAndActivities = {
  id: string;
  ocId: string;
  ocCampId: string;
  trainingCampId: string;
  year: number;
  totalMarksScored?: number;
  reviews?: CampReview[];
  activities?: CampActivity[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type OcCampsResponse = {
  camps: OcCampWithReviewsAndActivities[];
  grandTotalMarksScored: number;
  activities?: Array<{id: string, name: string, maxMarks: number, marksScored: number, remark?: string}>;
};

export type OcCampsQueryResponse = {
  camps: OcCampWithReviewsAndActivities[];
};

export type OcCampsUpsertResponse = {
  camps: OcCampWithReviewsAndActivities[];
  grandTotalMarksScored: number;
};

export type OcCampsUpdateResponse = {
  camps: OcCampWithReviewsAndActivities[];
  grandTotalMarksScored: number;
};

export type OcCampsDeleteResponse = {
  camps: OcCampWithReviewsAndActivities[];
  grandTotalMarksScored: number;
};
