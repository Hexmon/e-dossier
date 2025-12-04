"use client";

import React from "react";
import { useFormContext, FieldValues } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface CampFormRow {
  trainingCampId: string;
  year: number;
}

interface FormValues extends FieldValues {
  camps: CampFormRow[];
}

interface OcCampReviewsProps {
  campIndex: number;
  disabled?: boolean;
  camp: any | null;
  onDeleteReview: (reviewId: string) => Promise<void>;
}

export default function OcCampReviews({
  campIndex,
  disabled = false,
}: OcCampReviewsProps) {
  const { watch, register } = useFormContext<FormValues>();
  const campFormRow = watch(`camps.${campIndex}`) as CampFormRow | undefined;

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
          {/* First Textarea */}
          <div className="space-y-2">
            <Label htmlFor="textarea-1" className="font-medium">
              Basic DS
            </Label>
            {disabled ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">-</p>
            ) : (
              <Textarea
                id="textarea-1"
                {...register(`camps.${campIndex}.textarea1`)}
                placeholder="Enter text here"
                className="min-h-[120px]"
                rows={5}
              />
            )}
          </div>

          {/* Second Textarea */}
          <div className="space-y-2">
            <Label htmlFor="textarea-2" className="font-medium">
              Camp OIC
            </Label>
            {disabled ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">-</p>
            ) : (
              <Textarea
                id="textarea-2"
                {...register(`camps.${campIndex}.textarea2`)}
                placeholder="Enter text here"
                className="min-h-[120px]"
                rows={5}
              />
            )}
          </div>

          {/* Third Textarea */}
          <div className="space-y-2">
            <Label htmlFor="textarea-3" className="font-medium">
              Platoon Commander
            </Label>
            {disabled ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">-</p>
            ) : (
              <Textarea
                id="textarea-3"
                {...register(`camps.${campIndex}.textarea3`)}
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