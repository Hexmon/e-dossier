"use client";

import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface SemesterReviewsProps {
  semesterIndex: number;
  disabled?: boolean;
}

export default function SemesterReviews({
  semesterIndex,
  disabled = false,
}: SemesterReviewsProps) {
  const [activeSemester, setActiveSemester] = useState("SEM1");
  const [isEditing, setIsEditing] = useState(false);
  const [remarks, setRemarks] = useState<Record<
    string,
    { pc: string; dc: string; commander: string }
  >>({
    SEM1: { pc: "", dc: "", commander: "" },
    SEM2: { pc: "", dc: "", commander: "" },
    SEM3: { pc: "", dc: "", commander: "" },
    SEM4: { pc: "", dc: "", commander: "" },
    SEM5: { pc: "", dc: "", commander: "" },
    SEM6: { pc: "", dc: "", commander: "" },
  });

  const semesters = ["SEM1", "SEM2", "SEM3", "SEM4", "SEM5", "SEM6"];

  const handleChange = (field: "pc" | "dc" | "commander", value: string) => {
    setRemarks((prev) => ({
      ...prev,
      [activeSemester]: {
        ...prev[activeSemester],
        [field]: value,
      },
    }));
  };

  const handleSave = () => {
    setIsEditing(false);
    // Optionally notify or persist data here
  };
  const handleCancel = () => {
    setIsEditing(false);
    // Optionally discard changes or reload data here
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Semester Reviews</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Semesters buttons */}
          <div className="flex gap-2 flex-wrap">
            {semesters.map((sem) => (
              <Button
                key={sem}
                variant={activeSemester === sem ? "default" : "outline"}
                onClick={() => setActiveSemester(sem)}
                disabled={isEditing}
              >
                {sem}
              </Button>
            ))}
          </div>

          {/* Review Textareas */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-medium">Platoon Commander</Label>
              {disabled || !isEditing ? (
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {remarks[activeSemester]?.pc || "-"}
                </p>
              ) : (
                <Textarea
                  value={remarks[activeSemester]?.pc}
                  onChange={(e) => handleChange("pc", e.target.value)}
                  placeholder="Enter Platoon Commander remarks"
                  rows={5}
                  className="min-h-[120px]"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label className="font-medium">Deputy Commander</Label>
              {disabled || !isEditing ? (
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {remarks[activeSemester]?.dc || "-"}
                </p>
              ) : (
                <Textarea
                  value={remarks[activeSemester]?.dc}
                  onChange={(e) => handleChange("dc", e.target.value)}
                  placeholder="Enter Deputy Commander remarks"
                  rows={5}
                  className="min-h-[120px]"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label className="font-medium">Commander</Label>
              {disabled || !isEditing ? (
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {remarks[activeSemester]?.commander || "-"}
                </p>
              ) : (
                <Textarea
                  value={remarks[activeSemester]?.commander}
                  onChange={(e) => handleChange("commander", e.target.value)}
                  placeholder="Enter Commander remarks"
                  rows={5}
                  className="min-h-[120px]"
                />
              )}
            </div>
          </div>

          {/* Edit / Save Buttons */}
          {!disabled && (
            <div className="flex gap-3 justify-center mt-6">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>Save</Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>Edit</Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
