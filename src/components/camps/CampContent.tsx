"use client";

import React, { useState, useMemo } from "react";
import { useFormContext } from "react-hook-form";

import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

import OcCampActivitiesTable from "@/components/camps/campMarksTable";
import OcCampReviews from "@/components/camps/campReviews";

// Mock Data - Updated semester assignments
const mockAvailableCamps = [
  {
    id: "1",
    name: "EX-SURAKSHA",
    semester: "SEM5",
    activities: [
      { id: "1", name: "Activity 1", defaultMaxMarks: 30 },
      { id: "2", name: "Activity 2", defaultMaxMarks: 35 },
    ],
  },
  {
    id: "2",
    name: "EX-VAJRA",
    semester: "SEM6",
    activities: [
      { id: "3", name: "Activity 3", defaultMaxMarks: 25 },
      { id: "4", name: "Activity 4", defaultMaxMarks: 30 },
    ],
  },
  {
    id: "3",
    name: "TECHNO TAC CAMP",
    semester: "SEM6",
    activities: [
      { id: "5", name: "Activity 5", defaultMaxMarks: 40 },
      { id: "6", name: "Activity 6", defaultMaxMarks: 15 },
    ],
  },
];

// Mock camp type that matches OcCampActivitiesTable props
const createMockCamp = (trainingCampId: string, ocId: string) => ({
  id: trainingCampId,
  ocId: ocId,
  trainingCampId: trainingCampId,
  year: new Date().getFullYear(),
  totalMarksScored: 75,
  reviews: [] as any[],
  activities: [] as any[],
  createdAt: new Date(),
  updatedAt: new Date(),
});

interface CampContentProps {
  ocId: string;
}

export default function CampContent({ ocId }: CampContentProps) {
  // ---------------------------
  // STATE MANAGEMENT
  // ---------------------------
  const [activeSemester, setActiveSemester] = useState(0);
  const [selectedCampName, setSelectedCampName] = useState<string | null>(null);
  const [isEditingReviews, setIsEditingReviews] = useState(false);
  const [isEditingActivities, setIsEditingActivities] = useState(false);

  const semesters = ["SEM5", "SEM6"] as const;
  const semesterLabels = ["V TERM", "VI TERM"];
  const currentSemester = semesters[activeSemester];

  // ---------------------------
  // FORM SETUP
  // ---------------------------
  const { handleSubmit, getValues } = useFormContext();

  // ---------------------------
  // COMPUTED VALUES (Mock Data)
  // ---------------------------
  const availableCamps = useMemo(() => {
    return mockAvailableCamps.filter((camp) => camp.semester === currentSemester);
  }, [currentSemester]);

  const selectedTrainingCamp = useMemo(() => {
    return availableCamps.find((camp) => camp.name === selectedCampName);
  }, [availableCamps, selectedCampName]);

  const currentCamp = useMemo(() => {
    // Mock current camp data with all required properties
    if (!selectedTrainingCamp) return null;
    return createMockCamp(selectedTrainingCamp.id, ocId);
  }, [selectedTrainingCamp, ocId]);

  const availableActivities = useMemo(() => {
    if (!selectedTrainingCamp) return [];
    return selectedTrainingCamp.activities || [];
  }, [selectedTrainingCamp]);

  const showWarning = useMemo(() => {
    return selectedCampName && !selectedTrainingCamp;
  }, [selectedCampName, selectedTrainingCamp]);

  // ---------------------------
  // EFFECTS
  // ---------------------------
  const handleSemesterChange = (index: number) => {
    setActiveSemester(index);
    setSelectedCampName(null);
    setIsEditingReviews(false);
    setIsEditingActivities(false);
  };

  // Set first camp as selected when available camps change
  if (availableCamps.length > 0 && !selectedCampName) {
    setSelectedCampName(availableCamps[0].name);
  }

  // ---------------------------
  // HANDLERS
  // ---------------------------
  const handleSubmitReviewsForm = async () => {
    if (!selectedCampName) {
      console.log("No camp selected");
      return;
    }

    try {
      const values = getValues();
      const campData = values.campsByName?.[selectedCampName];

      if (!campData) {
        console.log("No data for this camp");
        return;
      }

      console.log("Reviews form submitted:", {
        campName: selectedCampName,
        reviews: campData.reviews || [],
      });

      setIsEditingReviews(false);
    } catch (error) {
      console.error("Error handling reviews form:", error);
    }
  };

  const handleSubmitActivitiesForm = async () => {
    if (!selectedCampName) {
      console.log("No camp selected");
      return;
    }

    try {
      const values = getValues();
      const campData = values.campsByName?.[selectedCampName];

      if (!campData || !campData.activities || campData.activities.length === 0) {
        console.log("No activity data to save");
        return;
      }

      console.log("Activities form submitted:", {
        campName: selectedCampName,
        activities: campData.activities,
      });

      setIsEditingActivities(false);
    } catch (error) {
      console.error("Error handling activities form:", error);
    }
  };

  const handleCancelActivities = () => {
    setIsEditingActivities(false);
  };

  const handleCancelReviews = () => {
    setIsEditingReviews(false);
  };

  const handleDeleteReview = (reviewId: string): void => {
    console.log("Delete review:", reviewId);
  };

  // ---------------------------
  // RENDER
  // ---------------------------
  return (
    <>
      <Card className="max-w-6xl mx-auto p-6 rounded-2xl shadow-xl bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-center">
            CAMP RECORDS
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* Semester Tabs */}
          <div className="flex justify-center mb-6 space-x-2">
            {semesterLabels.map((semester, idx) => (
              <button
                key={semester}
                type="button"
                onClick={() => handleSemesterChange(idx)}
                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  activeSemester === idx
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {semester}
              </button>
            ))}
          </div>
        </CardContent>

        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold mb-2 underline">
              {selectedCampName || "Select a Camp"}
            </CardTitle>

            {/* Camp Selection Buttons */}
            {availableCamps.length > 0 && (
              <div className="flex items-center space-x-2 flex-wrap gap-2">
                {availableCamps.map((camp) => (
                  <Button
                    key={camp.id}
                    type="button"
                    variant={
                      selectedCampName === camp.name ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setSelectedCampName(camp.name)}
                  >
                    {camp.name}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <CardDescription>
            <span className="text-md font-bold underline">
              Performance during Camp:
            </span>
            <span className="text-sm font-semibold text-gray-500 block mt-2">
              (To include application of theoretical knowledge, tactical acumen,
              logical approach, briefing/orders, appointment held, runback,
              strengths/weaknesses etc.)
            </span>
          </CardDescription>
        </CardHeader>

        {/* Warning/Info Notice */}
        {showWarning && (
          <CardContent className="mb-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800 font-medium">New Camp</p>
                <p className="text-sm text-blue-700 mt-1">
                  This camp hasn't been created yet. Fill in the details below
                  to create it.
                </p>
              </div>
            </div>
          </CardContent>
        )}

        {/* No Camp Selected */}
        {!selectedCampName && availableCamps.length > 0 && (
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p>Please select a camp from the options above.</p>
            </div>
          </CardContent>
        )}

        {/* No Camps Available */}
        {availableCamps.length === 0 && (
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p>No training camps available for this semester.</p>
              <p className="text-sm mt-2">
                Please check back later or contact administration.
              </p>
            </div>
          </CardContent>
        )}

        {/* REVIEWS SECTION */}
        {selectedCampName && (
          <div className="mt-6">
            <OcCampReviews
              campIndex={0}
              camp={currentCamp}
              onDeleteReview={handleDeleteReview}
              disabled={!isEditingReviews}
              campName={selectedCampName}
            />

            {!isEditingReviews && (
              <div className="flex justify-center mt-4">
                <Button
                  type="button"
                  onClick={() => setIsEditingReviews(true)}
                >
                  Edit Reviews
                </Button>
              </div>
            )}

            {isEditingReviews && (
              <div className="flex justify-center gap-3 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelReviews}
                >
                  Cancel
                </Button>

                <Button type="button" onClick={handleSubmitReviewsForm}>
                  Save Reviews
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ACTIVITIES SECTION */}
      {selectedCampName && (
        <div className="mt-6">
          <OcCampActivitiesTable
            camp={currentCamp}
            availableActivities={availableActivities}
            disabled={!isEditingActivities}
            campName={selectedCampName || ""}
          />

          {!isEditingActivities && (
            <div className="flex justify-center mt-4">
              <Button
                type="button"
                onClick={() => setIsEditingActivities(true)}
              >
                Edit Activity Marks
              </Button>
            </div>
          )}

          {isEditingActivities && (
            <div className="flex justify-center gap-3 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelActivities}
              >
                Cancel
              </Button>

              <Button type="button" onClick={handleSubmitActivitiesForm}>
                Save Activity Marks
              </Button>
            </div>
          )}
        </div>
      )}

      {/* TOTAL TABLE SECTION - ONLY FOR TECHNO TAC CAMP */}
      {selectedCampName && selectedTrainingCamp?.name === "TECHNO TAC CAMP" && (
        <div className="mt-6 max-w-6xl mx-auto">
          <Card className="p-6 rounded-2xl shadow-xl bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">TOTAL</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 text-left font-medium">
                        Camp
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-center font-medium">
                        Marks Obtained
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-center font-medium">
                        Max Marks
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">
                        EX-SURAKSHA
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        100
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        100
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">
                        EX-VAJRA
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        55
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        55
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">
                        TECHNO TAC CAMP
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        55
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        55
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">
                        TOTAL
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        210
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        210
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
