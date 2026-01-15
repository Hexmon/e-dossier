"use client";

import React, { useEffect, useRef } from "react";
import { useFormContext, FieldValues } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { OcCampData, ReviewRole } from "@/app/lib/api/campApi";

interface CampFormRow {
  trainingCampId: string;
  year: number;
  reviews?: Array<{
    role: ReviewRole;
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
  camp: OcCampData;
  onDeleteReview: (reviewId: string) => void;
  campName?: string;
}

// REVIEW PREFILL DATA - Consolidated camp names
const getReviewPrefillForCampType = (campName: string) => {
  const campMap: Record<
    string,
    Array<{ role: ReviewRole; sectionTitle: string; fieldName: string }>
  > = {
    "TECHNO TAC CAMP": [
      { role: "HOAT", sectionTitle: "Basic DS", fieldName: "basicDS" },
      { role: "OIC", sectionTitle: "Camp OIC", fieldName: "campOIC" },
      {
        role: "PLATOON_COMMANDER",
        sectionTitle: "Platoon Commander",
        fieldName: "platoonCommander",
      },
    ],
    "EX-SURAKSHA": [
      { role: "HOAT", sectionTitle: "Basic DS", fieldName: "basicDS" },
      { role: "OIC", sectionTitle: "Camp OIC", fieldName: "campOIC" },
      {
        role: "PLATOON_COMMANDER",
        sectionTitle: "Platoon Commander",
        fieldName: "platoonCommander",
      },
    ],
    "EX SURAKSHA": [
      { role: "HOAT", sectionTitle: "Basic DS", fieldName: "basicDS" },
      { role: "OIC", sectionTitle: "Camp OIC", fieldName: "campOIC" },
      {
        role: "PLATOON_COMMANDER",
        sectionTitle: "Platoon Commander",
        fieldName: "platoonCommander",
      },
    ],
    "EX-VAJRA": [
      { role: "HOAT", sectionTitle: "Basic DS", fieldName: "basicDS" },
      { role: "OIC", sectionTitle: "Camp OIC", fieldName: "campOIC" },
      {
        role: "PLATOON_COMMANDER",
        sectionTitle: "Platoon Commander",
        fieldName: "platoonCommander",
      },
    ],
    "EX VAJRA": [
      { role: "HOAT", sectionTitle: "Basic DS", fieldName: "basicDS" },
      { role: "OIC", sectionTitle: "Camp OIC", fieldName: "campOIC" },
      {
        role: "PLATOON_COMMANDER",
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
  const initializedRef = useRef<Set<string>>(new Set());

  // Watch this specific camp's data by campName
  const campFormRow = watch(`campsByName.${campName}`) as
    | CampFormRow
    | undefined;
  const formReviews = campFormRow?.reviews ?? [];

  // Initialize form reviews for this specific camp
  useEffect(() => {
    if (!campName || initializedRef.current.has(campName)) return;

    // Mark as initialized immediately
    initializedRef.current.add(campName);

    // If camp data exists from API, use that
    if (camp?.reviews && camp.reviews.length > 0) {
      const apiReviews = camp.reviews.map((review) => ({
        role: review.role,
        sectionTitle: review.sectionTitle,
        reviewText: review.reviewText,
      }));

      setValue(`campsByName.${campName}.reviews`, apiReviews, {
        shouldValidate: false,
        shouldDirty: false,
      });

      if (camp.trainingCampId) {
        setValue(`campsByName.${campName}.trainingCampId`, camp.trainingCampId, {
          shouldValidate: false,
          shouldDirty: false,
        });
      }

      setValue(`campsByName.${campName}.year`, camp.year, {
        shouldValidate: false,
        shouldDirty: false,
      });

      return;
    }

    // Otherwise, only initialize if there are no form reviews yet
    if (formReviews.length === 0) {
      const prefillData = getReviewPrefillForCampType(campName);

      if (prefillData.length > 0) {
        // Use fresh hardcoded structure - always 3 reviews
        const initialReviews: Array<{
          role: ReviewRole;
          sectionTitle: string;
          reviewText: string;
        }> = [
            {
              role: (prefillData[0]?.role || "HOAT") as ReviewRole,
              sectionTitle: prefillData[0]?.sectionTitle || "Basic DS",
              reviewText: "",
            },
            {
              role: (prefillData[1]?.role || "OIC") as ReviewRole,
              sectionTitle: prefillData[1]?.sectionTitle || "Camp OIC",
              reviewText: "",
            },
            {
              role: (prefillData[2]?.role || "PLATOON_COMMANDER") as ReviewRole,
              sectionTitle: prefillData[2]?.sectionTitle || "Platoon Commander",
              reviewText: "",
            },
          ];

        setValue(`campsByName.${campName}.reviews`, initialReviews, {
          shouldValidate: false,
          shouldDirty: false,
        });

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
  }, [campName, camp]);

  // Reset initialized flag when camp changes
  useEffect(() => {
    return () => {
      // Cleanup when component unmounts or camp changes
      if (campName) {
        initializedRef.current.delete(campName);
      }
    };
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
            <Label htmlFor={`textarea-1-${campName}`} className="font-medium">
              Basic DS
            </Label>
            {disabled ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {formReviews[0]?.reviewText || "-"}
              </p>
            ) : (
              <>
                <input
                  type="hidden"
                  value="HOAT"
                  {...register(`campsByName.${campName}.reviews.0.role`)}
                />
                <input
                  type="hidden"
                  value="Basic DS"
                  {...register(`campsByName.${campName}.reviews.0.sectionTitle`)}
                />
                <Textarea
                  id={`textarea-1-${campName}`}
                  {...register(`campsByName.${campName}.reviews.0.reviewText`)}
                  placeholder="Enter text here"
                  className="min-h-[120px]"
                  rows={5}
                />
              </>
            )}
          </div>

          {/* Camp OIC Textarea */}
          <div className="space-y-2">
            <Label htmlFor={`textarea-2-${campName}`} className="font-medium">
              Camp OIC
            </Label>
            {disabled ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {formReviews[1]?.reviewText || "-"}
              </p>
            ) : (
              <>
                <input
                  type="hidden"
                  value="OIC"
                  {...register(`campsByName.${campName}.reviews.1.role`)}
                />
                <input
                  type="hidden"
                  value="Camp OIC"
                  {...register(`campsByName.${campName}.reviews.1.sectionTitle`)}
                />
                <Textarea
                  id={`textarea-2-${campName}`}
                  {...register(`campsByName.${campName}.reviews.1.reviewText`)}
                  placeholder="Enter text here"
                  className="min-h-[120px]"
                  rows={5}
                />
              </>
            )}
          </div>

          {/* Platoon Commander Textarea */}
          <div className="space-y-2">
            <Label htmlFor={`textarea-3-${campName}`} className="font-medium">
              Platoon Commander
            </Label>
            {disabled ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {formReviews[2]?.reviewText || "-"}
              </p>
            ) : (
              <>
                <input
                  type="hidden"
                  value="PLATOON_COMMANDER"
                  {...register(`campsByName.${campName}.reviews.2.role`)}
                />
                <input
                  type="hidden"
                  value="Platoon Commander"
                  {...register(`campsByName.${campName}.reviews.2.sectionTitle`)}
                />
                <Textarea
                  id={`textarea-3-${campName}`}
                  {...register(`campsByName.${campName}.reviews.2.reviewText`)}
                  placeholder="Enter text here"
                  className="min-h-[120px]"
                  rows={5}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}