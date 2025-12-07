"use client";

import React, { useEffect } from "react";
import { useFormContext, FieldValues } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface CampFormRow {
  trainingCampId: string;
  year: number;
  reviews?: Array<{
    role: string;
    sectionTitle: string;
    reviewText: string;
  }>;
}

interface FormValues extends FieldValues {
  campsByName: {
    [campName: string]: CampFormRow;
  };
}

interface OcCampReviewsProps {
  campIndex: number;
  disabled?: boolean;
  camp: {
    id: string;
    ocId: string;
    trainingCampId: string;
    year: number;
    totalMarksScored: number;
    reviews: any[];
    activities: any[];
    createdAt: Date;
    updatedAt: Date;
  } | null;
  onDeleteReview: (reviewId: string) => void;
  campName?: string;
}

// HARDCODED PREFILL DATA - Review sections for camps with proper titles
const getReviewPrefillForCampType = (campName: string) => {
  const campMap: Record<
    string,
    Array<{ role: string; sectionTitle: string; fieldName: string }>
  > = {
    "TECHNO TAC CAMP": [
      { role: "basicDS", sectionTitle: "Basic DS", fieldName: "basicDS" },
      { role: "campOIC", sectionTitle: "Camp OIC", fieldName: "campOIC" },
      {
        role: "platoonCommander",
        sectionTitle: "Platoon Commander",
        fieldName: "platoonCommander",
      },
    ],
    "EX-SURAKSHA": [
      { role: "basicDS", sectionTitle: "Basic DS", fieldName: "basicDS" },
      { role: "campOIC", sectionTitle: "Camp OIC", fieldName: "campOIC" },
      {
        role: "platoonCommander",
        sectionTitle: "Platoon Commander",
        fieldName: "platoonCommander",
      },
    ],
    "EX-VAJRA": [
      { role: "basicDS", sectionTitle: "Basic DS", fieldName: "basicDS" },
      { role: "campOIC", sectionTitle: "Camp OIC", fieldName: "campOIC" },
      {
        role: "platoonCommander",
        sectionTitle: "Platoon Commander",
        fieldName: "platoonCommander",
      },
    ],
  };

  return campMap[campName] || [];
};

export default function OcCampReviews({
  campIndex,
  disabled = false,
  camp,
  onDeleteReview,
  campName = "",
}: OcCampReviewsProps) {
  const { watch, setValue, register } = useFormContext<FormValues>();

  // Watch this specific camp's data by campName
  const campFormRow = watch(`campsByName.${campName}`) as
    | CampFormRow
    | undefined;
  const formReviews = campFormRow?.reviews ?? [];

  // Initialize form reviews for this specific camp USING HARDCODED DATA
  useEffect(() => {
    // Only initialize if there are no form reviews yet for this camp
    if (!campFormRow || !formReviews || formReviews.length === 0) {
      const prefillData = getReviewPrefillForCampType(campName);

      if (prefillData.length > 0) {
        // Use fresh hardcoded structure - always 3 reviews
        const initialReviews = [
          {
            role: prefillData[0]?.role || "basicDS",
            sectionTitle: prefillData[0]?.sectionTitle || "Basic DS",
            reviewText: "",
          },
          {
            role: prefillData[1]?.role || "campOIC",
            sectionTitle: prefillData[1]?.sectionTitle || "Camp OIC",
            reviewText: "",
          },
          {
            role: prefillData[2]?.role || "platoonCommander",
            sectionTitle: prefillData[2]?.sectionTitle || "Platoon Commander",
            reviewText: "",
          },
        ];

        // Set the initial reviews for this specific camp
        setValue(`campsByName.${campName}.reviews`, initialReviews, {
          shouldValidate: false,
          shouldDirty: false,
        });

        // Also set the trainingCampId if available
        if (camp?.trainingCampId) {
          setValue(`campsByName.${campName}.trainingCampId`, camp.trainingCampId, {
            shouldValidate: false,
            shouldDirty: false,
          });
        }

        setValue(
          `campsByName.${campName}.year`,
          camp?.year || new Date().getFullYear(),
          {
            shouldValidate: false,
            shouldDirty: false,
          }
        );
      }
    }
    // Fixed dependency array with proper dependencies
  }, [campName]);

  return (
    <div className="max-w-6xl mx-auto p-6 rounded-2xl shadow-xl bg-white">
      <div className="flex flex-row items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">
          CAMP REVIEWS
          {disabled ? (
            <span className="text-sm font-normal text-gray-500 ml-2">
              (View Mode)
            </span>
          ) : (
            <span className="text-sm font-normal text-blue-600 ml-2">
              (Edit Mode)
            </span>
          )}
        </h2>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          {/* Basic DS Textarea */}
          <div className="space-y-2">
            <Label htmlFor="textarea-1" className="font-medium">
              Basic DS
            </Label>
            {disabled ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {formReviews[0]?.reviewText || "-"}
              </p>
            ) : (
              <Textarea
                id="textarea-1"
                {...register(`campsByName.${campName}.reviews.0.reviewText`)}
                placeholder="Enter text here"
                className="min-h-[120px]"
                rows={5}
              />
            )}
          </div>

          {/* Camp OIC Textarea */}
          <div className="space-y-2">
            <Label htmlFor="textarea-2" className="font-medium">
              Camp OIC
            </Label>
            {disabled ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {formReviews[1]?.reviewText || "-"}
              </p>
            ) : (
              <Textarea
                id="textarea-2"
                {...register(`campsByName.${campName}.reviews.1.reviewText`)}
                placeholder="Enter text here"
                className="min-h-[120px]"
                rows={5}
              />
            )}
          </div>

          {/* Platoon Commander Textarea */}
          <div className="space-y-2">
            <Label htmlFor="textarea-3" className="font-medium">
              Platoon Commander
            </Label>
            {disabled ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {formReviews[2]?.reviewText || "-"}
              </p>
            ) : (
              <Textarea
                id="textarea-3"
                {...register(`campsByName.${campName}.reviews.2.reviewText`)}
                placeholder="Enter text here"
                className="min-h-[120px]"
                rows={5}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
