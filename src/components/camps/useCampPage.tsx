"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { toast } from "sonner";
import { CampRow, OcCampsResponse } from "@/types/camp";
import {
  listOcCamps,
  createOcCamp,
  updateOcCamp,
  deleteOcCampData,
  UpdateOcCampData,
} from "@/app/lib/api/campApi";

const defaultCampRows: CampRow[] = [];

type CampTermKey = "SEM5" | "SEM6A-EX VAJRA" | "SEM6A-TECHNO TAC CAMP";

const CAMP_NAME_MAP: Record<CampTermKey, string> = {
  "SEM5": "EX SURAKSHA",
  "SEM6A-EX VAJRA": "EX VAJRA",
  "SEM6A-TECHNO TAC CAMP": "TECHNO TAC CAMP",
};

const getActivityPrefillForCampType = (campType: string) => {
  if (campType === "TECHNO TAC CAMP") {
    return [
      { id: "placeholder-1", activity: "Mini Proj", maxMarks: 30, marks: 0, remarks: "" },
      { id: "placeholder-2", activity: "Tech Seminar", maxMarks: 20, marks: 0, remarks: "" },
      { id: "placeholder-3", activity: "Mut Assessment", maxMarks: 5, marks: 0, remarks: "" },
    ];
  } else if (campType === "EX SURAKSHA") {
    return [
      { id: "placeholder-1", activity: "Run Back", maxMarks: 25, marks: 0, remarks: "" },
      { id: "placeholder-2", activity: "Ex Disha Khoj", maxMarks: 30, marks: 0, remarks: "" },
      { id: "placeholder-3", activity: "Tent Pitching", maxMarks: 15, marks: 0, remarks: "" },
      { id: "placeholder-4", activity: "Orders/Bfg", maxMarks: 20, marks: 0, remarks: "" },
      { id: "placeholder-5", activity: "Mut Assessment", maxMarks: 10, marks: 0, remarks: "" },
    ];
  } else if (campType === "EX VAJRA") {
    return [
      { id: "placeholder-1", activity: "Physical Fitness", maxMarks: 50, marks: 0, remarks: "" },
      { id: "placeholder-2", activity: "Weapon Training", maxMarks: 50, marks: 0, remarks: "" },
      { id: "placeholder-3", activity: "Tactical Training", maxMarks: 100, marks: 0, remarks: "" },
      { id: "placeholder-4", activity: "Leadership", maxMarks: 50, marks: 0, remarks: "" },
      { id: "placeholder-5", activity: "Navigation", maxMarks: 50, marks: 0, remarks: "" },
    ];
  }
  return [];
};

const mergeApiUuidsIntoPrefill = (
  prefill: any[],
  apiActivities: any[]
) => {
  return prefill.map((prefillRow, idx) => {
    const { id, activity, marks, maxMarks, remarks } = prefillRow;
    const apiActivity = apiActivities[idx];
    return {
      id: apiActivity?.id || id,
      activity: apiActivity?.name || activity,
      marks: apiActivity?.marksScored ?? marks,
      maxMarks: apiActivity?.maxMarks ?? maxMarks,
      remarks: apiActivity?.remark ?? remarks,
    };
  });
};

const getActivitiesFromApiResponse = (campData: OcCampsResponse | null) => {
  if (!campData?.activities) return [];
  const { activities } = campData;
  return activities.map((activity) => {
    const { id, name, maxMarks, marksScored, remark } = activity;
    return {
      id,
      trainingCampActivityId: id,
      name,
      maxMarks,
      marksScored,
      remark,
    };
  });
};

export function useCampPage() {
  const selectedCadet = useSelector((s: RootState) => s.cadet.selectedCadet);
  const [activeTab, setActiveTab] = useState(0);

  const [viTermCampType, setViTermCampType] = useState<
    "EX VAJRA" | "TECHNO TAC CAMP"
  >("EX VAJRA");

  const [isEditingReviewsByTerm, setIsEditingReviewsByTerm] = useState<
    Record<CampTermKey, boolean>
  >({
    "SEM5": false,
    "SEM6A-EX VAJRA": false,
    "SEM6A-TECHNO TAC CAMP": false,
  });

  const [isEditingActivitiesByTerm, setIsEditingActivitiesByTerm] = useState<
    Record<CampTermKey, boolean>
  >({
    "SEM5": false,
    "SEM6A-EX VAJRA": false,
    "SEM6A-TECHNO TAC CAMP": false,
  });

  const [isSavingActivities, setIsSavingActivities] = useState(false);
  const [isSavingReviews, setIsSavingReviews] = useState(false);

  const [errorByTerm, setErrorByTerm] = useState<
    Record<CampTermKey, string>
  >({
    "SEM5": "",
    "SEM6A-EX VAJRA": "",
    "SEM6A-TECHNO TAC CAMP": "",
  });

  const [campDataByTerm, setCampDataByTerm] = useState<
    Record<CampTermKey, OcCampsResponse | null>
  >({
    "SEM5": null,
    "SEM6A-EX VAJRA": null,
    "SEM6A-TECHNO TAC CAMP": null,
  });

  const [originalCampDataByTerm, setOriginalCampDataByTerm] = useState<
    Record<CampTermKey, OcCampsResponse | null>
  >({
    "SEM5": null,
    "SEM6A-EX VAJRA": null,
    "SEM6A-TECHNO TAC CAMP": null,
  });

  const [loadingByTerm, setLoadingByTerm] = useState<
    Record<CampTermKey, boolean>
  >({
    "SEM5": false,
    "SEM6A-EX VAJRA": false,
    "SEM6A-TECHNO TAC CAMP": false,
  });

  const [activityPrefillByTerm] = useState<
    Record<CampTermKey, any[]>
  >({
    "SEM5": getActivityPrefillForCampType("EX SURAKSHA"),
    "SEM6A-EX VAJRA": getActivityPrefillForCampType("EX VAJRA"),
    "SEM6A-TECHNO TAC CAMP": getActivityPrefillForCampType("TECHNO TAC CAMP"),
  });

  const [hasSavedDataByTerm, setHasSavedDataByTerm] = useState<
    Record<CampTermKey, boolean>
  >({
    "SEM5": false,
    "SEM6A-EX VAJRA": false,
    "SEM6A-TECHNO TAC CAMP": false,
  });

  const prevDataRef = useRef<Record<CampTermKey, OcCampsResponse | null>>(
    campDataByTerm
  );

  const defaultFormValues = {
    campRowsByTerm: {
      "SEM5": defaultCampRows,
      "SEM6A-EX VAJRA": defaultCampRows,
      "SEM6A-TECHNO TAC CAMP": defaultCampRows,
    } as Record<CampTermKey, CampRow[]>,
    grandTotalMarksScoredByTerm: {
      "SEM5": 0,
      "SEM6A-EX VAJRA": 0,
      "SEM6A-TECHNO TAC CAMP": 0,
    } as Record<CampTermKey, number>,
    reviewsByTerm: {
      "SEM5": { oic: "", basicDs: "", piCdr: "" },
      "SEM6A-EX VAJRA": { oic: "", basicDs: "", piCdr: "" },
      "SEM6A-TECHNO TAC CAMP": { oic: "", basicDs: "", piCdr: "" },
    } as Record<CampTermKey, { oic: string; basicDs: string; piCdr: string }>,
  };

  const methods = useForm<{
    campRowsByTerm: Record<CampTermKey, CampRow[]>;
    grandTotalMarksScoredByTerm: Record<CampTermKey, number>;
    reviewsByTerm: Record<
      CampTermKey,
      { oic: string; basicDs: string; piCdr: string }
    >;
  }>({
    defaultValues: defaultFormValues,
  });

  const { setValue } = methods;

  const handleTabChange = (idx: number) => {
    setActiveTab(idx);
    const key = (idx === 1
      ? `SEM6A-${viTermCampType}`
      : "SEM5") as CampTermKey;
    setIsEditingReviewsByTerm((prev) => ({
      ...prev,
      [key]: false,
    }));
    setIsEditingActivitiesByTerm((prev) => ({
      ...prev,
      [key]: false,
    }));
    updateFormForTerm(idx);
  };

  const buildMergedActivitiesForTerm = (key: CampTermKey) => {
    const termData = campDataByTerm[key];
    const prefill = activityPrefillByTerm[key];

    if (!prefill || prefill.length === 0) return [];

    const apiActivities = termData?.activities || [];
    const hasSavedData = hasSavedDataByTerm[key];

    if (apiActivities.length > 0) {
      return prefill.map((pref, idx) => {
        const apiActivity = apiActivities[idx];
        return {
          id: apiActivity?.id || pref.id,
          trainingCampActivityId: apiActivity?.id || pref.id,
          name: apiActivity?.name || pref.activity,
          maxMarks: apiActivity?.maxMarks || pref.maxMarks,
          marksScored: apiActivity?.marksScored ?? 0, 
          remark: apiActivity?.remark || "", 
        };
      });
    }

    if (!hasSavedData) {
      return prefill.map((pref) => ({
        id: pref.id,
        trainingCampActivityId: pref.id,
        name: pref.activity,
        maxMarks: pref.maxMarks,
        marksScored: 0,
        remark: "",
      }));
    }

    return prefill.map((pref) => ({
      id: pref.id,
      trainingCampActivityId: pref.id,
      name: pref.activity,
      maxMarks: pref.maxMarks,
      marksScored: pref.marks ?? 0,
      remark: pref.remarks || "",
    }));
  };

  const updateFormForTerm = (tabIndex: number, data?: OcCampsResponse | null) => {
    const key = (tabIndex === 1
      ? `SEM6A-${viTermCampType}`
      : "SEM5") as CampTermKey;

    if (isEditingActivitiesByTerm[key] || isEditingReviewsByTerm[key]) {
      console.log(`⏭️ Skipping form update for ${key} - user editing`);
      return;
    }
    const termData = data || campDataByTerm[key];

    const hasSaved = termData?.camps?.[0]?.ocCampId ? true : false;
    if (hasSaved) {
      setHasSavedDataByTerm((prev) => ({
        ...prev,
        [key]: true,
      }));
    }

    const merged = buildMergedActivitiesForTerm(key);

    if (termData && termData.camps.length > 0) {
      const camp = termData.camps[0];

      const campWithMerged = { ...camp, activities: merged };
      setValue(`campRowsByTerm.${key}`, [campWithMerged]);
      setValue(`grandTotalMarksScoredByTerm.${key}`, termData.grandTotalMarksScored || 0);

      if (camp.reviews && camp.reviews.length > 0) {
        const reviews = camp.reviews.reduce(
          (acc, review) => {
            if (review.role === "OIC") acc.oic = review.reviewText || "";
            else if (review.role === "PLATOON_COMMANDER")
              acc.basicDs = review.reviewText || "";
            else if (review.role === "HOAT")
              acc.piCdr = review.reviewText || "";
            return acc;
          },
          { oic: "", basicDs: "", piCdr: "" }
        );
        setValue(`reviewsByTerm.${key}`, reviews);
      } else {
        setValue(`reviewsByTerm.${key}`, { oic: "", basicDs: "", piCdr: "" });
      }
    } else if (termData?.activities && termData.activities.length > 0) {
      const activities = getActivitiesFromApiResponse(termData);
      const fakeCamp: CampRow = {
        id: "",
        ocId: selectedCadet?.ocId || "",
        trainingCampId: "",
        year: new Date().getFullYear(),
        activities,
        reviews: [],
      };
      setValue(`campRowsByTerm.${key}`, [fakeCamp]);
      setValue(`grandTotalMarksScoredByTerm.${key}`, termData.grandTotalMarksScored || 0);
      setValue(`reviewsByTerm.${key}`, { oic: "", basicDs: "", piCdr: "" });
    } else {
      if (merged && merged.length > 0) {
        const fakeCamp: CampRow = {
          id: termData?.camps?.[0]?.ocCampId || "",
          ocId: selectedCadet?.ocId || "",
          trainingCampId: termData?.camps?.[0]?.trainingCampId || "",
          year: new Date().getFullYear(),
          activities: merged,
          reviews: termData?.camps?.[0]?.reviews || [],
        };
        setValue(`campRowsByTerm.${key}`, [fakeCamp]);
      } else {
        setValue(`campRowsByTerm.${key}`, defaultCampRows);
      }
      setValue(`grandTotalMarksScoredByTerm.${key}`, termData?.grandTotalMarksScored || 0);
      setValue(`reviewsByTerm.${key}`, { oic: "", basicDs: "", piCdr: "" });
    }
  };

  const fetchCampDataForTerm = async (key: CampTermKey) => {
    if (!selectedCadet?.ocId) return;

    setLoadingByTerm((prev) => ({
      ...prev,
      [key]: true,
    }));

    setErrorByTerm((prev) => ({
      ...prev,
      [key]: null,
    }));

    try {
      const semester = key.startsWith("SEM6A") ? "SEM6A" : "SEM5";
      const campName = CAMP_NAME_MAP[key];

      const data = await listOcCamps(selectedCadet.ocId, {
        semester,
        campName,
        withActivities: "true",
        withReviews: "true",
      });

      prevDataRef.current = { ...prevDataRef.current, [key]: data };

      setCampDataByTerm((prev) => ({
        ...prev,
        [key]: data,
      }));

      setOriginalCampDataByTerm((prev) => ({
        ...prev,
        [key]: JSON.parse(JSON.stringify(data)),
      }));

      const isActiveTab =
        (activeTab === 0 && key === "SEM5") ||
        (activeTab === 1 && key === `SEM6A-${viTermCampType}`);

      if (isActiveTab) {
        updateFormForTerm(activeTab, data);
      }
    } catch (error: any) {

      let errorMessage = `Failed to load ${CAMP_NAME_MAP[key]} camp data`;

      if (error?.status === 404) {
        errorMessage = `No ${CAMP_NAME_MAP[key]} camp data found. Create a new entry.`;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      setErrorByTerm((prev) => ({
        ...prev,
        [key]: errorMessage,
      }));

      toast.error(errorMessage);
    }
    finally {
      setLoadingByTerm((prev) => ({
        ...prev,
        [key]: false,
      }));
    }
  };

  useEffect(() => {
    if (selectedCadet?.ocId && !isEditingActivitiesByTerm[currentKey]) {
      if (activeTab === 0) {
        const semester = "SEM5" as CampTermKey;
        if (!campDataByTerm[semester]) {
          fetchCampDataForTerm(semester);
        } else {
          updateFormForTerm(activeTab);
        }
      } else if (activeTab === 1) {
        const key = `SEM6A-${viTermCampType}` as CampTermKey;
        if (!campDataByTerm[key]) {
          fetchCampDataForTerm(key);
        } else {
          updateFormForTerm(activeTab);
        }
      }
    }
  }, [selectedCadet?.ocId, activeTab, viTermCampType]);

  const onSubmitReviews = async (data: any) => {
    if (!selectedCadet?.ocId) return;

    setIsSavingReviews(true);
    try {
      const currentKey = (activeTab === 1
        ? `SEM6A-${viTermCampType}`
        : "SEM5") as CampTermKey;
      const reviewsData = data.reviewsByTerm[currentKey];
      const existingCampData = campDataByTerm[currentKey];
      const existingCamp = existingCampData?.camps?.[0];

      const trainingCampId = existingCampData?.camps?.[0]?.trainingCampId;

      if (!trainingCampId) {
        throw new Error("Training camp ID not found");
      }

      const reviews = [
        {
          role: "OIC" as const,
          sectionTitle: "Performance Review",
          reviewText: reviewsData.oic,
        },
        {
          role: "PLATOON_COMMANDER" as const,
          sectionTitle: "Performance Review",
          reviewText: reviewsData.basicDs,
        },
        {
          role: "HOAT" as const,
          sectionTitle: "Performance Review",
          reviewText: reviewsData.piCdr,
        },
      ].filter((review) => review.reviewText.trim() !== "");

      const payload: UpdateOcCampData = {
        trainingCampId,
        year: existingCamp?.year || new Date().getFullYear(),
        reviews,
        activities: existingCamp?.activities || [],
      };

      if (existingCamp?.id) {
        payload.ocCampId = existingCamp.id;
        await updateOcCamp(selectedCadet.ocId, payload);
      } else {
        await createOcCamp(selectedCadet.ocId, {
          trainingCampId,
          year: new Date().getFullYear(),
          reviews,
        });
      }

      toast.success("Reviews saved successfully");

      setIsEditingReviewsByTerm((prev) => ({
        ...prev,
        [currentKey]: false,
      }));

      await new Promise(resolve => setTimeout(resolve, 300));
      fetchCampDataForTerm(currentKey);
    } catch (error: any) {
      let errorMessage = "Failed to save reviews";
      if (error?.message) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsSavingReviews(false);
    }
  };

  const onSubmitActivities = async (data: any, { reset, getValues }: any) => {
    if (!selectedCadet?.ocId) return;

    setIsSavingActivities(true);
    try {
      const currentKey = (activeTab === 1
        ? `SEM6A-${viTermCampType}`
        : "SEM5") as CampTermKey;

      const campRow = data.campRowsByTerm[currentKey]?.[0];

      if (!campRow) {
        throw new Error("No camp data found");
      }

      interface UIActivity {
        trainingCampActivityId: string;
        marksScored?: number | string | null;
        remark?: string | null;
      }

      const allActivities = campRow.activities || [];

      const validActivities = (allActivities as UIActivity[])
        .filter((a) => {
          if (!a) return false;

          if (
            !a.trainingCampActivityId ||
            typeof a.trainingCampActivityId !== "string" ||
            !/^[0-9a-fA-F-]{36}$/.test(a.trainingCampActivityId)
          ) {
            return false;
          }

          const hasMarks =
            a.marksScored !== undefined &&
            a.marksScored !== null &&
            a.marksScored !== "";

          const hasRemark = Boolean(a.remark?.trim());

          return hasMarks || hasRemark;
        })
        .map((a) => ({
          trainingCampActivityId: a.trainingCampActivityId,
          marksScored:
            typeof a.marksScored === "string"
              ? parseInt(a.marksScored, 10) || 0
              : a.marksScored || 0,
          remark: a.remark?.trim() || "",
        }));

      const existingCampData = campDataByTerm[currentKey];
      const trainingCampId = existingCampData?.camps?.[0]?.trainingCampId;

      if (!trainingCampId) {
        throw new Error("Training camp ID not found");
      }

      const payload: UpdateOcCampData = {
        trainingCampId,
        year: campRow.year || new Date().getFullYear(),
        activities: validActivities,
        reviews: existingCampData?.camps?.[0]?.reviews || [],
      };

      if (campRow.id && /^[0-9a-fA-F-]{36}$/.test(campRow.id)) {
        payload.ocCampId = campRow.id;
        await updateOcCamp(selectedCadet.ocId, payload);
      } else {
        await createOcCamp(selectedCadet.ocId, {
          trainingCampId,
          year: campRow.year || new Date().getFullYear(),
          activities: validActivities,
        });
      }


      toast.success("Activity marks saved successfully ✅");

      setIsEditingActivitiesByTerm((prev) => ({
        ...prev,
        [currentKey]: false,
      }));

      reset({
        campRowsByTerm: {
          ...getValues("campRowsByTerm"),
          [currentKey]: [
            {
              ...getValues(`campRowsByTerm.${currentKey}.0`),
              activities: allActivities,
            },
          ],
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 500));
      fetchCampDataForTerm(currentKey);
    } catch (error: any) {
      toast.error(error?.message || "Failed to save activity marks");
    } finally {
      setIsSavingActivities(false);
    }
  };
  const deleteActivity = async (activityScoreId: string) => {
    if (!selectedCadet?.ocId) return;

    try {
      await deleteOcCampData(selectedCadet.ocId, { activityScoreId });
      toast.success("Activity deleted successfully");

      const currentKey = (activeTab === 1
        ? `SEM6A-${viTermCampType}`
        : "SEM5") as CampTermKey;

      await new Promise(resolve => setTimeout(resolve, 300));
      fetchCampDataForTerm(currentKey);
    } catch (error: any) {

      let errorMessage = "Failed to delete activity";
      if (error?.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    }
  };

  const currentKey = (activeTab === 1
    ? `SEM6A-${viTermCampType}`
    : "SEM5") as CampTermKey;
  const currentCampData = campDataByTerm[currentKey];
  const currentLoading = loadingByTerm[currentKey];
  const currentError = errorByTerm[currentKey];
  const currentActivityPrefill = activityPrefillByTerm[currentKey];

  return {
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
    buildMergedActivitiesForTerm,
    currentActivityPrefill,
  };
}