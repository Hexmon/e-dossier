"use client";

import React, { useMemo, useEffect } from "react";
import { useFormContext, FieldValues } from "react-hook-form";
import { UniversalTable, TableConfig } from "@/components/layout/TableLayout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// ---------- Helpers ----------
const safeDefault = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const n = Number(v);
  return isNaN(n) ? "" : String(v);
};

// ---------- Types ----------
interface FormActivity {
  trainingCampActivityId: string;
  name: string;
  marksScored: number | null;
  defaultMaxMarks: number;
  remark?: string | null;
}

interface CampFormRow {
  trainingCampId: string;
  year: number;
  activities?: FormActivity[];
}

interface FormValues extends FieldValues {
  campsByName: {
    [campName: string]: CampFormRow;
  };
}

type ActivityRowData = {
  trainingCampActivityId: string;
  activityName: string;
  marksScored: number;
  maxMarks: number;
  remark: string;
  isTotal?: boolean;
  activityScoreId?: string;
};

interface OcCampActivitiesTableProps {
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
  availableActivities: Array<{
    id: string;
    name: string;
    defaultMaxMarks: number;
  }>;
  disabled?: boolean;
  campName: string;
}

// HARDCODED PREFILL DATA - This defines the activities for each camp
const getActivityPrefillForCampType = (campName: string) => {
  const campMap: Record<string, Array<{ id: string; activity: string; maxMarks: number }>> = {
    "TECHNO TAC CAMP": [
      { id: "techno-1", activity: "Mini Proj", maxMarks: 30 },
      { id: "techno-2", activity: "Tech Seminar", maxMarks: 20 },
      { id: "techno-3", activity: "Mut Assessment", maxMarks: 5 },
    ],
    "EX-SURAKSHA": [
      { id: "suraksha-1", activity: "Run Back", maxMarks: 25 },
      { id: "suraksha-2", activity: "Ex Disha Khoj", maxMarks: 30 },
      { id: "suraksha-3", activity: "Tent Pitching", maxMarks: 15 },
      { id: "suraksha-4", activity: "Orders/Bfg", maxMarks: 20 },
      { id: "suraksha-5", activity: "Mut Assessment", maxMarks: 10 },
    ],
    "EX-VAJRA": [
      { id: "vajra-1", activity: "Physical Fitness", maxMarks: 50 },
      { id: "vajra-2", activity: "Weapon Training", maxMarks: 50 },
      { id: "vajra-3", activity: "Tactical Training", maxMarks: 100 },
      { id: "vajra-4", activity: "Leadership", maxMarks: 50 },
      { id: "vajra-5", activity: "Navigation", maxMarks: 50 },
    ],
  };

  return campMap[campName] || [];
};

export default function OcCampActivitiesTable({
  camp,
  availableActivities,
  disabled = false,
  campName,
}: OcCampActivitiesTableProps) {
  const { register, watch, setValue } = useFormContext<FormValues>();

  // Watch this specific camp's data by campName
  const campFormRow = watch(`campsByName.${campName}`) as CampFormRow | undefined;
  const formActivities = campFormRow?.activities ?? [];

  // Initialize form activities for this specific camp USING HARDCODED DATA
  useEffect(() => {
    // Only initialize if there are no form activities yet for this camp
    if (!campFormRow || formActivities.length === 0) {
      let initialActivities: FormActivity[] = [];

      // Get hardcoded prefill data for this specific camp
      const prefillData = getActivityPrefillForCampType(campName);

      if (prefillData.length > 0) {
        // Use fresh hardcoded structure
        initialActivities = prefillData.map((item) => ({
          trainingCampActivityId: item.id,
          name: item.activity,
          marksScored: null,
          defaultMaxMarks: item.maxMarks,
          remark: null,
        }));

        // Set the initial activities for this specific camp
        setValue(`campsByName.${campName}.activities`, initialActivities, {
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

        setValue(`campsByName.${campName}.year`, camp?.year || new Date().getFullYear(), {
          shouldValidate: false,
          shouldDirty: false,
        });
      }
    }
  }, [camp, campName, setValue, campFormRow, formActivities.length]);

  const activityData: ActivityRowData[] = useMemo(() => {
    let rows: ActivityRowData[] = [];

    // Use formActivities if they exist
    if (formActivities && formActivities.length > 0) {
      rows = formActivities.map((formAct) => {
        return {
          trainingCampActivityId: formAct.trainingCampActivityId || "",
          activityName: formAct.name || "",
          marksScored:
            formAct.marksScored !== null && formAct.marksScored !== undefined
              ? Number(formAct.marksScored)
              : 0,
          maxMarks: Number(formAct.defaultMaxMarks) || 0,
          remark: formAct.remark || "",
          activityScoreId: undefined,
        };
      });
    }

    // Calculate totals
    const totalMarksScored = rows.reduce(
      (sum, r) => sum + (r.marksScored ? Number(r.marksScored) : 0),
      0
    );

    const totalMaxMarks = rows.reduce(
      (sum, r) => sum + Number(r.maxMarks || 0),
      0
    );

    // Add total row
    rows.push({
      trainingCampActivityId: "total",
      activityName: "Total",
      marksScored: totalMarksScored,
      maxMarks: totalMaxMarks,
      remark: "",
      isTotal: true,
    });

    return rows;
  }, [formActivities]);

  const tableConfig: TableConfig<ActivityRowData> = {
    columns: [
      {
        key: "activityName",
        label: "Activity",
        render: (_value, row) => {
          return (
            <span className={row?.isTotal ? "font-semibold" : "font-medium"}>
              {row.activityName}
            </span>
          );
        },
      },
      {
        key: "marksScored",
        label: "Marks Scored",
        render: (_value, row, index = 0) => {
          if (row?.isTotal) {
            return (
              <span className="font-semibold text-lg">
                {row.marksScored !== 0 ? row.marksScored : "-"}
              </span>
            );
          }

          if (disabled) {
            return (
              <span className="font-medium text-center">
                {row.marksScored !== 0 ? row.marksScored : "-"}
              </span>
            );
          }

          return (
            <Input
              type="number"
              min="0"
              max={row.maxMarks}
              {...register(
                `campsByName.${campName}.activities.${index}.marksScored`,
                { valueAsNumber: true }
              )}
              placeholder="0"
              className="w-20"
            />
          );
        },
      },
      {
        key: "maxMarks",
        label: "Max Marks",
        render: (_value, row) => {
          return (
            <span className={row?.isTotal ? "font-semibold text-lg" : ""}>
              {row.maxMarks}
            </span>
          );
        },
      },
      {
        key: "remark",
        label: "Remarks",
        render: (_value, row, index = 0) => {
          if (row?.isTotal) {
            return <span className="text-gray-500">-</span>;
          }

          if (disabled) {
            return (
              <span className="text-sm text-gray-600">
                {row.remark || "-"}
              </span>
            );
          }

          return (
            <Input
              {...register(`campsByName.${campName}.activities.${index}.remark`)}
              placeholder="Enter remarks"
              className="w-32"
            />
          );
        },
      },
    ],
    features: {
      sorting: false,
      filtering: false,
      search: false,
      pagination: false,
    },
    styling: {
      hover: true,
      striped: false,
      bordered: true,
    },
  };

  return (
    <Card className="max-w-6xl mx-auto p-6 rounded-2xl shadow-xl bg-white">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          ACTIVITY MARKS - {campName}
          {disabled ? (
            <span className="text-sm font-normal text-gray-500 ml-2">
              (View Mode)
            </span>
          ) : (
            <span className="text-sm font-normal text-blue-600 ml-2">
              (Edit Mode)
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <UniversalTable data={activityData} config={tableConfig} />
    </Card>
  );
}
