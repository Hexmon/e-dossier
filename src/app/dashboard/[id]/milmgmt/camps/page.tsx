"use client";

import React, { useState, useMemo, useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useParams } from "next/navigation";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import DossierTab from "@/components/Tabs/DossierTab";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Shield, AlertCircle } from "lucide-react";
import { TabsContent, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import OcCampActivitiesTable from "@/components/camps/campMarksTable";
import OcCampReviews from "@/components/camps/campReviews";
import { useOcCamps, useOcCamp } from "@/hooks/useOcCamps";
import { useTrainingCamps } from "@/hooks/useTrainingCamps";
import { toast } from "sonner";


interface FormValues {
  campsByName: {
    [campName: string]: {
      trainingCampId: string;
      year: number;
      reviews?: Array<{
        role: string;
        sectionTitle: string;
        reviewText: string;
      }>;
      activities?: Array<{
        trainingCampActivityId: string;
        name: string;
        marksScored: number | null;
        defaultMaxMarks: number;
        remark?: string | null;
      }>;
    };
  };
}


export default function OcCampsPage() {
  // ---------------------------
  // DYNAMIC ROUTE ID (FIX HERE!)
  // ---------------------------
  const params = useParams();
  // Handle both 'id' and 'ocId' param names, similar to your working file
  const paramId = params?.ocId || params?.id;
  const ocId = Array.isArray(paramId) ? paramId[0] : paramId ?? "";

  // ---------------------------
  // STATE MANAGEMENT
  // ---------------------------
  const [activeSemester, setActiveSemester] = useState(0);
  const [selectedCampName, setSelectedCampName] = useState<string | null>(null);
  const [isEditingReviews, setIsEditingReviews] = useState(false);
  const [isEditingActivities, setIsEditingActivities] = useState(false);
  const [isSavingReviews, setIsSavingReviews] = useState(false);
  const [isSavingActivities, setIsSavingActivities] = useState(false);

  const semesters = ["SEM5", "SEM6A"] as const;
  const semesterLabels = ["SEMESTER 5", "SEMESTER 6"];
  const currentSemester = semesters[activeSemester];

  // ---------------------------
  // FORM SETUP
  // ---------------------------
  const methods = useForm<FormValues>({
    defaultValues: {
      campsByName: {},
    },
  });

  const { handleSubmit, getValues, reset } = methods;

  // ---------------------------
  // FETCH DATA
  // ---------------------------
  const { camps: trainingCampsData, loading: loadingTrainingCamps } =
    useTrainingCamps({
      semester: currentSemester,
      includeActivities: true,
    });

  const {
    cadet,
    loadingCadet,
    camps: ocCamps,
    grandTotalMarksScored,
    loading: loadingOcCamps,
    createCamp,
    removeReview,
  } = useOcCamps(ocId, {
    semester: currentSemester,
    withReviews: true,
    withActivities: true,
  });

  const { saveCamp } = useOcCamp(ocId);

  const currentLoading = loadingTrainingCamps || loadingOcCamps;

  // ---------------------------
  // COMPUTED VALUES
  // ---------------------------
  const availableCamps = useMemo(() => {
  const data = trainingCampsData as any;

  if (Array.isArray(data)) {
    return data.filter((camp: any) => camp.semester === currentSemester);
  }

  if (data && Array.isArray(data.items)) {
    return data.items.filter(
      (camp: any) => camp.semester === currentSemester
    );
  }

  return [];
}, [trainingCampsData, currentSemester]);

  const selectedTrainingCamp = useMemo(() => {
    return availableCamps.find((camp: any) => camp.name === selectedCampName);
  }, [availableCamps, selectedCampName]);

  const currentCamp = useMemo(() => {
    if (!selectedTrainingCamp || !ocCamps) return null;
    return ocCamps.find(
      (oc) => oc.trainingCampId === selectedTrainingCamp.id
    );
  }, [ocCamps, selectedTrainingCamp]);

  const availableActivities = useMemo(() => {
    if (!selectedTrainingCamp) return [];

    if ("activities" in selectedTrainingCamp && selectedTrainingCamp.activities) {
      return selectedTrainingCamp.activities || [];
    }

    return [];
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

  useEffect(() => {
    if (availableCamps.length > 0 && !selectedCampName) {
      setSelectedCampName(availableCamps[0].name);
    }
  }, [availableCamps, selectedCampName]);

  // Debug logs
  useEffect(() => {
    console.log("=== CAMPS PAGE DEBUG ===");
    console.log("ocId:", ocId);
    console.log("cadet:", cadet);
    console.log("loadingCadet:", loadingCadet);
    console.log("========================");
  }, [ocId, cadet, loadingCadet]);

  // ---------------------------
  // HANDLERS
  // ---------------------------
  const handleSubmitReviewsForm = async () => {
    if (!selectedCampName) {
      toast.error("No camp selected");
      return;
    }

    setIsSavingReviews(true);
    try {
      const values = getValues();
      const campData = values.campsByName?.[selectedCampName];

      if (!campData) {
        toast.error("No data for this camp");
        return;
      }

      const payload = {
        trainingCampId: selectedTrainingCamp?.id || "",
        campName: selectedCampName,
        year: new Date().getFullYear(),
        reviews: campData.reviews || [],
      };
      console.log("payload:", payload);

      if (currentCamp) {
        console.log("currentCamp:", currentCamp);
        await saveCamp({ ...payload, ocCampId: currentCamp.id });
      } else {
        console.log("createCamp:", createCamp);
        await createCamp(payload);
      }

      setIsEditingReviews(false);
      toast.success("Reviews saved successfully!");
    } catch (error) {
      console.error("Error saving reviews:", error);
      toast.error("Failed to save reviews");
    } finally {
      setIsSavingReviews(false);
    }
  };

  const handleSubmitActivitiesForm = async () => {
    if (!selectedCampName) {
      toast.error("No camp selected");
      return;
    }

    setIsSavingActivities(true);
    try {
      const values = getValues();
      const campData = values.campsByName?.[selectedCampName];

      if (!campData || !campData.activities || campData.activities.length === 0) {
        toast.error("No activity data to save");
        return;
      }

      const payload = {
        trainingCampId: selectedTrainingCamp?.id || "",
        campName: selectedCampName,
        year: new Date().getFullYear(),
        activities: campData.activities.map((a) => ({
          trainingCampActivityId: a.trainingCampActivityId,
          name: a.name,
          marksScored: a.marksScored || 0,
          defaultMaxMarks: a.defaultMaxMarks,
          remark: a.remark || null,
        })),
      };

      if (currentCamp) {
        await saveCamp({ ...payload, ocCampId: currentCamp.id });
      } else {
        await createCamp(payload);
      }

      setIsEditingActivities(false);
      toast.success("Activity marks saved successfully!");
    } catch (error) {
      console.error("Error saving activities:", error);
      toast.error("Failed to save activity marks");
    } finally {
      setIsSavingActivities(false);
    }
  };

  const handleCancelActivities = () => {
    setIsEditingActivities(false);
  };

  const handleCancelReviews = () => {
    setIsEditingReviews(false);
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await removeReview(reviewId);
      toast.success("Review deleted successfully!");
    } catch (error) {
      console.error("Error deleting review:", error);
      toast.error("Failed to delete review");
    }
  };



  // ---------------------------
  // RENDER
  // ---------------------------
  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(handleSubmitActivitiesForm)}>
        <DashboardLayout
          title="Camp Records"
          description="Manage OC Camp performance and reviews"
        >
          <main className="p-6">
            <BreadcrumbNav
              paths={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Dossier", href: `/dashboard/${ocId}/milmgmt` },
                { label: "Camp Records" },
              ]}
            />

            {/* CADET TABLE - Removed conditional and made always visible */}
            {cadet && (
              <SelectedCadetTable
                selectedCadet={{
                  name: cadet.name ?? "",
                  courseName: cadet.courseName ?? "",
                  ocNumber: cadet.ocNumber ?? "",
                  ocId: cadet.ocId ?? "",
                  course: cadet.course ?? "",
                }}
              />
            )}

            <DossierTab
              ocId={ocId}
              tabs={dossierTabs}
              defaultValue="camps"
              extraTabs={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <TabsTrigger
                      value="miltrg"
                      className="flex items-center gap-2"
                    >
                      <Shield className="h-4 w-4" />
                      Mil-Trg
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </TabsTrigger>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {militaryTrainingCards.map((card) => {
                      const link = card.to(ocId);
                      if (!link) return null;

                      return (
                        <DropdownMenuItem key={card.title} asChild>
                          <a href={link} className="flex items-center gap-2">
                            <card.icon className={`h-4 w-4 ${card.color}`} />
                            {card.title}
                          </a>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              }
            >
              <TabsContent value="camps">
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
                          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${activeSemester === idx
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                        >
                          {semester}
                        </button>
                      ))}
                    </div>

                    {/* Grand Total Display */}
                    {grandTotalMarksScored > 0 && (
                      <div className="text-center mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-medium text-blue-900">
                          Grand Total Marks Scored:{" "}
                          <span className="text-lg font-bold">
                            {grandTotalMarksScored}
                          </span>
                        </p>
                      </div>
                    )}
                  </CardContent>

                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold mb-2 underline">
                        {selectedCampName || "Select a Camp"}
                      </CardTitle>

                      {/* Camp Selection Buttons */}
                      {availableCamps.length > 0 && (
                        <div className="flex items-center space-x-2 flex-wrap gap-2">
                          {availableCamps.map((camp: any) => (
                            <Button
                              key={camp.id}
                              type="button"
                              variant={
                                selectedCampName === camp.name
                                  ? "default"
                                  : "outline"
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
                        (To include application of theoretical knowledge,
                        tactical acumen, logical approach, briefing/orders,
                        appointment held, runback, strengths/weaknesses etc.)
                      </span>
                    </CardDescription>
                  </CardHeader>

                  {/* Loading State */}
                  {currentLoading && (
                    <CardContent>
                      <div className="text-center py-8 text-gray-500">
                        <p>Loading camp data...</p>
                      </div>
                    </CardContent>
                  )}

                  {/* Warning/Info Notice */}
                  {showWarning && !currentLoading && (
                    <CardContent className="mb-4">
                      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-blue-800 font-medium">
                            New Camp
                          </p>
                          <p className="text-sm text-blue-700 mt-1">
                            This camp hasn't been created yet. Fill in the details below to create it.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  )}

                  {/* No Camp Selected */}
                  {!selectedCampName &&
                    availableCamps.length > 0 &&
                    !currentLoading && (
                      <CardContent>
                        <div className="text-center py-8 text-gray-500">
                          <p>Please select a camp from the options above.</p>
                        </div>
                      </CardContent>
                    )}

                  {/* No Camps Available */}
                  {availableCamps.length === 0 && !currentLoading && (
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
                  {selectedCampName && !currentLoading && (
                    <div className="mt-6">
                      <OcCampReviews
                        campIndex={0}
                        camp={currentCamp ?? null}
                        onDeleteReview={handleDeleteReview}
                        disabled={!isEditingReviews}
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
                            disabled={currentLoading || isSavingReviews}
                          >
                            Cancel
                          </Button>

                          <Button
                            type="button"
                            onClick={handleSubmitReviewsForm}
                            disabled={currentLoading || isSavingReviews}
                          >
                            {isSavingReviews ? "Saving..." : "Save Reviews"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </Card>



                {/* ACTIVITIES SECTION */}
                {selectedCampName && !currentLoading && (
                  <div className="mt-6">
                    <OcCampActivitiesTable
                      camp={currentCamp ?? null}
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
                          disabled={currentLoading || isSavingActivities}
                        >
                          Cancel
                        </Button>

                        <Button
                          type="button"
                          onClick={handleSubmitActivitiesForm}
                          disabled={currentLoading || isSavingActivities}
                        >
                          {isSavingActivities
                            ? "Saving..."
                            : "Save Activity Marks"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {/* TOTAL TABLE SECTION - ONLY FOR TECHNO TAC CAMP */}
                {selectedCampName && !currentLoading && selectedTrainingCamp?.name === "TECHNO TAC CAMP" && (
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
                                <th className="border border-gray-300 px-4 py-2 text-left font-medium">Camp</th>
                                <th className="border border-gray-300 px-4 py-2 text-center font-medium">Marks Obtained</th>
                                <th className="border border-gray-300 px-4 py-2 text-center font-medium">Max Marks</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-4 py-2">EX-SURAKSHA</td>
                                <td className="border border-gray-300 px-4 py-2 text-center">{grandTotalMarksScored || 0}</td>
                                <td className="border border-gray-300 px-4 py-2 text-center">100</td>
                              </tr>
                              <tr className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-4 py-2">EX-VAJRA</td>
                                <td className="border border-gray-300 px-4 py-2 text-center">{grandTotalMarksScored || 0}</td>
                                <td className="border border-gray-300 px-4 py-2 text-center">55</td>
                              </tr>
                              <tr>
                                <td className="border border-gray-300 px-4 py-2">TECHNO TAC CAMP</td>
                                <td className="border border-gray-300 px-4 py-2 text-center">{grandTotalMarksScored || 0}</td>
                                <td className="border border-gray-300 px-4 py-2 text-center">55</td>
                              </tr>
                              <tr>
                                <td className="border border-gray-300 px-4 py-2">TOTAL</td>
                                <td className="border border-gray-300 px-4 py-2 text-center">{grandTotalMarksScored || 0}</td>
                                <td className="border border-gray-300 px-4 py-2 text-center">210</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

              </TabsContent>
            </DossierTab>
          </main>
        </DashboardLayout>
      </form>
    </FormProvider>
  );
}