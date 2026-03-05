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
  primarySignatureLabel?: string;
  secondarySignatureLabel?: string;
}

export default function OcCampReviews({
  campIndex,
  disabled = false,
  camp,
  onDeleteReview,
  campName = "",
  primarySignatureLabel = "OIC Camp",
  secondarySignatureLabel = "PI Cdr",
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
      const initialReviews: Array<{
        role: ReviewRole;
        sectionTitle: string;
        reviewText: string;
      }> = [
        {
          role: "HOAT",
          sectionTitle: "Performance Notes",
          reviewText: "",
        },
        {
          role: "OIC",
          sectionTitle: primarySignatureLabel,
          reviewText: "",
        },
        {
          role: "PLATOON_COMMANDER",
          sectionTitle: secondarySignatureLabel,
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
  }, [campName, camp, formReviews.length, primarySignatureLabel, secondarySignatureLabel, setValue]);

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
    <div className="max-w-6xl mx-auto p-6 rounded-2xl shadow-xl bg-card">
      <div className="flex flex-row items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">
          CAMP REVIEWS
          {disabled ? (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              (View Mode)
            </span>
          ) : (
            <span className="text-sm font-normal text-primary ml-2">
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
              Performance Notes
            </Label>
            {disabled ? (
              <p className="text-sm text-foreground whitespace-pre-wrap">
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
                  value="Performance Notes"
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
              {primarySignatureLabel}
            </Label>
            {disabled ? (
              <p className="text-sm text-foreground whitespace-pre-wrap">
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
                  value={primarySignatureLabel}
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
              {secondarySignatureLabel}
            </Label>
            {disabled ? (
              <p className="text-sm text-foreground whitespace-pre-wrap">
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
                  value={secondarySignatureLabel}
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
