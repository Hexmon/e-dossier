"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useFormContext } from "react-hook-form";

import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";

import OcCampActivitiesTable from "@/components/camps/campMarksTable";
import OcCampReviews from "@/components/camps/campReviews";
import { useTrainingCamps, useOcCampByName, useCampMutations, useAllOcCamps } from "@/hooks/useCampData";
import { CreateOcCampPayload, UpdateOcCampPayload } from "@/app/lib/api/campApi";
import { trainingCampActivities } from "@/app/db/schema/training/oc";

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
  const { getValues } = useFormContext();

  // ---------------------------
  // API HOOKS
  // ---------------------------
  const { trainingCamps, loading: loadingCamps, error: campsError } = useTrainingCamps();
  const { camp: currentCamp, loading: loadingCamp, refetch: refetchCamp } = useOcCampByName(
    ocId,
    selectedCampName
  );
  const {
    createCamp,
    updateCamp,
    isCreating,
    isUpdating,
    mutationError,
  } = useCampMutations(ocId);

  // Fetch all camps for totals calculation
  const { camps: allCamps, loading: loadingAllCamps } = useAllOcCamps(ocId);

  console.log("final table", allCamps)

  // ---------------------------
  // COMPUTED VALUES
  // ---------------------------
  const availableCamps = useMemo(() => {
    // For SEM6, include both SEM6A and SEM6B camps
    if (currentSemester === "SEM6") {
      const filtered = trainingCamps.filter(
        (camp) => camp.semester === "SEM6A" || camp.semester === "SEM6B"
      );
      console.log("SEM6 camps:", filtered);
      return filtered;
    }
    const filtered = trainingCamps.filter((camp) => camp.semester === currentSemester);
    console.log(`${currentSemester} camps:`, filtered);
    return filtered;
  }, [trainingCamps, currentSemester]);

  // Debug logging
  useEffect(() => {
    console.log("All training camps:", trainingCamps);
    console.log("Current semester:", currentSemester);
    console.log("Available camps:", availableCamps);
  }, [trainingCamps, currentSemester, availableCamps]);

  const selectedTrainingCamp = useMemo(() => {
    return availableCamps.find((camp) => camp.name === selectedCampName);
  }, [availableCamps, selectedCampName]);

  const availableActivities = useMemo(() => {
    if (!selectedTrainingCamp) return [];
    return selectedTrainingCamp.activities || [];
  }, [selectedTrainingCamp]);

  // Debug logging
  useEffect(() => {
    console.log("Current semester:", currentSemester);
    console.log("Available Activites:", availableActivities);
  }, [currentSemester, availableActivities]);

  const showWarning = useMemo(() => {
    return selectedCampName && !currentCamp && !loadingCamp;
  }, [selectedCampName, currentCamp, loadingCamp]);

  // Calculate totals for TECHNO TAC CAMP table from API data
  const campTotals = useMemo(() => {
    if (!allCamps?.length) return {};

    const totals: Record<string, { obtained: number; max: number }> = {};

    allCamps.forEach((camp) => {
      const {
        campName,
        totalMarksScored,
        activities,
      } = camp;

      if (!campName) return;
      const maxMarks = activities.reduce(
        (sum, { maxMarks }) => sum + Number(maxMarks || 0),
        0
      );

      totals[campName] = {
        obtained: Number(totalMarksScored) || 0,
        max: maxMarks,
      };
    });

    return totals;
  }, [allCamps]);


  const totalSum = useMemo(() => {
    const values = Object.values(campTotals);
    return {
      obtained: values.reduce((sum, { obtained }) => sum + obtained, 0),
      max: values.reduce((sum, { max }) => sum + max, 0),
    };
  }, [campTotals]);

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
  useEffect(() => {
    if (availableCamps.length > 0 && !selectedCampName) {
      setSelectedCampName(availableCamps[0]?.name || null);
    }
  }, [availableCamps, selectedCampName]);

  // ---------------------------
  // HANDLERS
  // ---------------------------
  const handleSubmitReviewsForm = async () => {
    if (!selectedCampName || !selectedTrainingCamp) {
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

      const reviews = campData.reviews || [];

      if (currentCamp) {
        // Update existing camp
        const payload: UpdateOcCampPayload = {
          ocCampId: currentCamp.id,
          trainingCampId: selectedTrainingCamp.id,
          year: campData.year || new Date().getFullYear(),
          reviews,
        };

        await updateCamp(payload);
      } else {
        // Create new camp
        const payload: CreateOcCampPayload = {
          trainingCampId: selectedTrainingCamp.id,
          year: campData.year || new Date().getFullYear(),
          reviews,
        };

        await createCamp(payload);
      }

      await refetchCamp();
      setIsEditingReviews(false);
    } catch (error) {
      console.error("Error handling reviews form:", error);
    }
  };

  // Key changes in handleSubmitActivitiesForm and handleCancelActivities

  const handleSubmitActivitiesForm = async () => {
    if (!selectedCampName || !selectedTrainingCamp) {
      console.log("No camp selected");
      return;
    }

    try {
      const values = getValues();
      console.log("All form values:", values);
      const campData = values.campsByName?.[selectedCampName];
      console.log("Camp data:", campData);

      if (!campData || !campData.activities || campData.activities.length === 0) {
        console.log("No activity data to save");
        return;
      }

      console.log("Activities before mapping:", campData.activities);

      // Ensure all required fields are present
      const activities = campData.activities
        .filter((activity: {
          trainingCampActivityId?: string;
          marksScored?: number | null;
          remark?: string | null;
        }) => activity.trainingCampActivityId)
        .map((activity: {
          trainingCampActivityId: string;
          marksScored?: number | null;
          remark?: string | null;
        }) => ({
          trainingCampActivityId: activity.trainingCampActivityId,
          marksScored: activity.marksScored ?? null,
          remark: activity.remark || null,
        }));

      if (activities.length === 0) {
        console.log("No valid activities to save");
        return;
      }

      if (currentCamp) {
        // Update existing camp
        const payload: UpdateOcCampPayload = {
          ocCampId: currentCamp.id,
          trainingCampId: selectedTrainingCamp.id,
          year: campData.year || new Date().getFullYear(),
          activities,
        };

        await updateCamp(payload);
      } else {
        // Create new camp
        const payload: CreateOcCampPayload = {
          trainingCampId: selectedTrainingCamp.id,
          year: campData.year || new Date().getFullYear(),
          activities,
        };

        await createCamp(payload);
      }

      // Exit edit mode first, then refetch
      setIsEditingActivities(false);

      // Add a small delay before refetching to ensure state updates
      setTimeout(() => {
        refetchCamp();
      }, 100);
    } catch (error) {
      console.error("Error handling activities form:", error);
    }
  };

  const handleCancelActivities = async () => {
    // Refetch to restore original data
    await refetchCamp();
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
  if (loadingCamps) {
    return (
      <Card className="max-w-6xl mx-auto p-6 rounded-2xl shadow-xl bg-card">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading camps...</span>
        </CardContent>
      </Card>
    );
  }

  if (campsError) {
    return (
      <Card className="max-w-6xl mx-auto p-6 rounded-2xl shadow-xl bg-card">
        <CardContent className="py-12">
          <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-destructive font-medium">Error Loading Camps</p>
              <p className="text-sm text-destructive mt-1">{campsError}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="max-w-6xl mx-auto p-6 rounded-2xl shadow-xl bg-card">
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
                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${activeSemester === idx
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-muted/80"
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
                {availableCamps.map((camp) => {
                  const { id, name } = camp;
                  return (
                    <Button
                      key={id}
                      type="button"
                      variant={selectedCampName === name ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCampName(name)}
                    >
                      {name}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>

          <CardDescription>
            <span className="text-md font-bold underline">
              Performance during Camp:
            </span>
            <span className="text-sm font-semibold text-muted-foreground block mt-2">
              (To include application of theoretical knowledge, tactical acumen,
              logical approach, briefing/orders, appointment held, runback,
              strengths/weaknesses etc.)
            </span>
          </CardDescription>
        </CardHeader>

        {/* Mutation Error */}
        {mutationError && (
          <CardContent className="mb-4">
            <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-destructive font-medium">Error</p>
                <p className="text-sm text-destructive mt-1">{mutationError}</p>
              </div>
            </div>
          </CardContent>
        )}

        {/* Warning/Info Notice */}
        {showWarning && (
          <CardContent className="mb-4">
            <div className="flex items-start gap-3 p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-primary font-medium">New Camp</p>
                <p className="text-sm text-primary mt-1">
                  This camp hasn't been created yet. Fill in the details below
                  to create it.
                </p>
              </div>
            </div>
          </CardContent>
        )}

        {/* Loading Camp Data */}
        {loadingCamp && selectedCampName && (
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Loading camp data...</span>
            </div>
          </CardContent>
        )}

        {/* No Camp Selected */}
        {!selectedCampName && availableCamps.length > 0 && (
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>Please select a camp from the options above.</p>
            </div>
          </CardContent>
        )}

        {/* No Camps Available */}
        {availableCamps.length === 0 && (
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>No training camps available for this semester.</p>
              <p className="text-sm mt-2">
                Please check back later or contact administration.
              </p>
            </div>
          </CardContent>
        )}

        {/* REVIEWS SECTION */}
        {selectedCampName && !loadingCamp && (
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
                  disabled={isCreating || isUpdating}
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
                  disabled={isCreating || isUpdating}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  onClick={handleSubmitReviewsForm}
                  disabled={isCreating || isUpdating}
                >
                  {isCreating || isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Reviews"
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ACTIVITIES SECTION */}
      {selectedCampName && !loadingCamp && (
        <div className="mt-6">
          <OcCampActivitiesTable
            camp={currentCamp}
            availableActivities={availableActivities}
            disabled={!isEditingActivities}
            campName={selectedCampName}
          />

          {!isEditingActivities && (
            <div className="flex justify-center mt-4">
              <Button
                type="button"
                onClick={() => setIsEditingActivities(true)}
                disabled={isCreating || isUpdating}
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
                disabled={isCreating || isUpdating}
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={handleSubmitActivitiesForm}
                disabled={isCreating || isUpdating}
              >
                {isCreating || isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Activity Marks"
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* TOTAL TABLE SECTION */}
      {selectedCampName && selectedTrainingCamp?.name === "TECHNO TAC CAMP" && (
        <div className="mt-6 max-w-6xl mx-auto">
          <Card className="p-6 rounded-2xl shadow-xl bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">TOTAL</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAllCamps ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-3 text-muted-foreground">Loading totals...</span>
                </div>
              ) : Object.keys(campTotals).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No camp data available for totals calculation.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-border">
                    <thead className="bg-muted/70">
                      <tr>
                        <th className="border border-border px-4 py-2 text-left font-medium">
                          Camp
                        </th>
                        <th className="border border-border px-4 py-2 text-center font-medium">
                          Marks Obtained
                        </th>
                        <th className="border border-border px-4 py-2 text-center font-medium">
                          Max Marks
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(campTotals).map(([campName, { obtained, max }]) => (
                        <tr key={campName} className="hover:bg-muted/40">
                          <td className="border border-border px-4 py-2">
                            {campName}
                          </td>
                          <td className="border border-border px-4 py-2 text-center">
                            {obtained}
                          </td>
                          <td className="border border-border px-4 py-2 text-center">
                            {max}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-muted/40">
                        <td className="border border-border px-4 py-2 font-semibold">
                          TOTAL
                        </td>
                        <td className="border border-border px-4 py-2 text-center font-semibold">
                          {totalSum.obtained}
                        </td>
                        <td className="border border-border px-4 py-2 text-center font-semibold">
                          {totalSum.max}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
