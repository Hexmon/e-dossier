"use client";

import React from "react";
import { FormProvider } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import ActivityMarksTable from "@/components/camps/ActivityMarksTable";
import { term } from "@/constants/app.constants";
import { useCampPage } from "@/components/camps/useCampPage";

export default function Page() {
  const {
    selectedCadet,
    activeTab,
    viTermCampType,
    setViTermCampType,
    methods,
    handleTabChange,
    onSubmitReviews,
    onSubmitActivities,
    deleteActivity,
    currentKey,
    currentCampData,
    currentLoading,
    currentError,
    isEditingReviewsByTerm,
    isEditingActivitiesByTerm,
    setIsEditingReviewsByTerm,
    setIsEditingActivitiesByTerm,
    isSavingActivities,
    isSavingReviews,
  } = useCampPage();

  const { handleSubmit, register, getValues, reset } = methods;

  const currentIsEditingReviews = isEditingReviewsByTerm[currentKey];
  const currentIsEditingActivities = isEditingActivitiesByTerm[currentKey];

  // --- HANDLERS ---
  const handleSubmitReviews = async () => {
    const values = getValues();
    await onSubmitReviews(values);
  };

  const handleSubmitActivities = async () => {
    const values = getValues();
    await onSubmitActivities(values, { reset, getValues });
  };
  

const handleCancelActivities = () => {
  setIsEditingActivitiesByTerm((prev) => ({
    ...prev,
    [currentKey]: false,
  }));
  // NO reset() - preserve user input
};

  return (
    <FormProvider {...methods}>
      {/* ❗ FIXED — The form now has onSubmit to initialize form context properly */}
      <form onSubmit={handleSubmit(handleSubmitActivities)}>
        <DashboardLayout
          title="Camp Records"
          description="Manage Camp records and performance"
        >
          <main className="p-6">
            <BreadcrumbNav
              paths={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Dossier", href: "/dashboard/milmgmt" },
                { label: "Camp Records" },
              ]}
            />

            {selectedCadet && (
              <div className="hidden md:flex sticky top-16 z-40 mb-6">
                <SelectedCadetTable selectedCadet={selectedCadet} />
              </div>
            )}

            <DossierTab
              tabs={dossierTabs}
              defaultValue="camps"
              extraTabs={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <TabsTrigger
                      value="dossier-insp"
                      className="flex items-center gap-2"
                    >
                      <Shield className="h-4 w-4" />
                      Mil-Trg
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </TabsTrigger>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {militaryTrainingCards.map((card) =>
                      card.to ? (
                        <DropdownMenuItem key={card.to} asChild>
                          <a href={card.to} className="flex items-center gap-2">
                            <card.icon className={`h-4 w-4 ${card.color}`} />
                            <span>{card.title}</span>
                          </a>
                        </DropdownMenuItem>
                      ) : null
                    )}
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
                    <div className="flex justify-center mb-6 space-x-2">
                      {term.map((termLabel, idx) => (
                        <button
                          key={termLabel}
                          type="button"
                          onClick={() => handleTabChange(idx)}
                          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                            activeTab === idx
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                        >
                          {termLabel}
                        </button>
                      ))}
                    </div>
                  </CardContent>

                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold mb-2 underline">
                        {term[activeTab] === "VI TERM"
                          ? `${viTermCampType} (VI TERM)`
                          : "EX SURAKSHA (V TERM)"}
                      </CardTitle>

                      {term[activeTab] === "VI TERM" && (
                        <div className="flex items-center space-x-2">
                          <Button
                            type="button"
                            variant={
                              viTermCampType === "EX VAJRA"
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() => setViTermCampType("EX VAJRA")}
                          >
                            EX VAJRA
                          </Button>

                          <Button
                            type="button"
                            variant={
                              viTermCampType === "TECHNO TAC CAMP"
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() =>
                              setViTermCampType("TECHNO TAC CAMP")
                            }
                          >
                            TECHNO TAC CAMP
                          </Button>
                        </div>
                      )}
                    </div>

                    <CardDescription>
                      <span className="text-md font-bold underline">
                        Performance during Camp:
                      </span>
                      <span className="text-sm font-semibold text-gray-500 block mt-2">
                        (To incl appl of theoretical knowledge, tac acumen,
                        logical approach, bfg/orders, appt held, runback,
                        strengths/weaknesses etc.)
                      </span>
                    </CardDescription>
                  </CardHeader>

                  {currentError &&
                    !currentIsEditingReviews &&
                    !currentIsEditingActivities && (
                      <CardContent className="mb-4">
                        <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                          <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-orange-800 font-medium">
                              Notice
                            </p>
                            <p className="text-sm text-orange-700 mt-1">
                              {currentError}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    )}

                  {/* --- REVIEWS SECTION --- */}
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">
                        Performance Review by OIC
                      </label>
                      <Textarea
                        {...register(`reviewsByTerm.${currentKey}.oic`)}
                        className="mt-1 min-h-[100px]"
                        placeholder="Enter OIC review..."
                        disabled={currentLoading || !currentIsEditingReviews}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">
                        Performance Review by Platoon Commander
                      </label>
                      <Textarea
                        {...register(`reviewsByTerm.${currentKey}.basicDs`)}
                        className="mt-1 min-h-[100px]"
                        placeholder="Enter Basic DS review..."
                        disabled={currentLoading || !currentIsEditingReviews}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">
                        Performance Review by HOAT
                      </label>
                      <Textarea
                        {...register(`reviewsByTerm.${currentKey}.piCdr`)}
                        className="mt-1 min-h-[100px]"
                        placeholder="Enter HOAT review..."
                        disabled={currentLoading || !currentIsEditingReviews}
                      />
                    </div>
                  </CardContent>

                  {!currentIsEditingReviews && (
                    <CardContent className="flex justify-center">
                      <Button
                        type="button"
                        onClick={() =>
                          setIsEditingReviewsByTerm((prev) => ({
                            ...prev,
                            [currentKey]: true,
                          }))
                        }
                      >
                        Edit Reviews
                      </Button>
                    </CardContent>
                  )}

                  {currentIsEditingReviews && (
                    <CardContent className="flex justify-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setIsEditingReviewsByTerm((prev) => ({
                            ...prev,
                            [currentKey]: false,
                          }))
                        }
                        disabled={currentLoading}
                      >
                        Cancel
                      </Button>

                      <Button
                        type="button"
                        onClick={handleSubmitReviews}
                        disabled={currentLoading || isSavingReviews}
                      >
                        {isSavingReviews ? "Saving..." : "Save"}
                      </Button>
                    </CardContent>
                  )}
                </Card>

                {/* --- ACTIVITIES SECTION --- */}
                {!currentError && (
                  <Card className="max-w-6xl mx-auto p-6 rounded-2xl shadow-xl bg-white mt-6">
                    <ActivityMarksTable
                      campData={currentCampData}
                      // loading={currentLoading}
                      campName={
                        activeTab === 1 ? viTermCampType : "EX SURAKSHA"
                      }
                      currentTermKey={currentKey}
                      disabled={!currentIsEditingActivities}
                      // onDeleteActivity={deleteActivity}
                    />

                    {!currentIsEditingActivities && (
                      <div className="flex justify-center mt-4">
                        <Button
                          type="button"
                          onClick={() =>
                            setIsEditingActivitiesByTerm((prev) => ({
                              ...prev,
                              [currentKey]: true,
                            }))
                          }
                        >
                          Edit Activity Marks
                        </Button>
                      </div>
                    )}

                    {currentIsEditingActivities && (
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
                          onClick={handleSubmitActivities}
                          disabled={currentLoading || isSavingActivities}
                        >
                          {isSavingActivities ? "Saving..." : "Save Activity Marks"}
                        </Button>
                      </div>
                    )}
                  </Card>
                )}
              </TabsContent>
            </DossierTab>
          </main>
        </DashboardLayout>
      </form>
    </FormProvider>
  );
}
