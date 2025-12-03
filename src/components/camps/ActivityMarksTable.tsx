"use client";

import React, { useMemo } from "react";
import { useFormContext, FieldValues } from "react-hook-form";
import { UniversalTable, TableConfig } from "@/components/layout/TableLayout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { OcCampsResponse } from "@/types/camp";

// ---------- Helpers ----------
const safeDefault = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const n = Number(v);
  return isNaN(n) ? "" : String(v);
};

// ---------- Types ----------
interface FormActivity {
  id: string;
  name: string;
  marksScored: number | null;
  maxMarks: number;
  remark?: string;
}

interface CampRow {
  activities?: FormActivity[];
}

interface FormValues extends FieldValues {
  campRowsByTerm: {
    [key: string]: CampRow[];
  };
}

type ActivityData = {
  id: string;
  activity: string;
  marks: number;
  maxMarks: number;
  remarks: string;
  isTotal?: boolean;
  activityScoreId?: string;
};

interface ActivityMarksTableProps {
  campData: OcCampsResponse | null;
  // loading: boolean;
  campName?: string;
  currentTermKey: string;
  disabled: boolean;
  inputRows?: ActivityData[];
}


export default function ActivityMarksTable({
  campData,
  // loading,
  campName,
  currentTermKey,
  disabled,
  inputRows = [],
}: ActivityMarksTableProps) {
  const { register, watch } = useFormContext<FormValues>();
  const campRow = watch(`campRowsByTerm.${currentTermKey}.0`) as CampRow | undefined;

  const formActivities = campRow?.activities ?? [];
  const activityData: ActivityData[] = useMemo(() => {
    let rows: ActivityData[] = [];




    if (formActivities && formActivities.length > 0) {
      rows = formActivities.map((formAct) => {
        return {
          id: formAct?.id || "",
          activity: formAct?.name || "",
          marks:
            formAct?.marksScored !== null && formAct?.marksScored !== undefined
              ? Number(formAct.marksScored)
              : 0,
          maxMarks: Number(formAct?.maxMarks) || 0,
          remarks: formAct?.remark || "",
          activityScoreId: formAct?.id,
        };
      });
    } else {
      rows = (inputRows || []).map((prefill) => ({
        id: prefill.id,
        activity: prefill.activity,
        marks: 0,
        maxMarks: Number(prefill.maxMarks) || 0,
        remarks: "",
        activityScoreId: undefined,
      }));
    }

    // ---- Calculate Totals ----
    const totalMarks = rows.reduce(
      (sum, r) => sum + (r.marks ? Number(r.marks) : 0),
      0
    );

    const totalMax = rows.reduce((sum, r) => sum + Number(r.maxMarks || 0), 0);

    rows.push({
      id: "total",
      activity: "Total",
      marks: totalMarks,
      maxMarks: totalMax,
      remarks: "",
      isTotal: true,
    });

    return rows;
  }, [formActivities]);

  const tableConfig: TableConfig<ActivityData> = {
    columns: [
      {
        key: "activity",
        label: "Activity",
        render: (_value, row) => {
          return (
            <span className={row?.isTotal ? "font-semibold" : "font-medium"}>
              {row.activity}
            </span>
          );
        },
      },
      {
        key: "marks",
        label: "Marks",
        render: (_value, row, index = 0) => {
          if (row?.isTotal) {
            return (
              <span className="font-semibold text-lg">
                {row.marks !== 0 ? row.marks : "-"}
              </span>
            );
          }

          if (disabled) {
            return (
              <span className="font-medium text-center">
                {row.marks !== 0 ? row.marks : "-"}
              </span>
            );
          }

          return (
            <Input
              type="number"
              min="0"
              max={row.maxMarks}
              {...register(
                `campRowsByTerm.${currentTermKey}.0.activities.${index}.marksScored`,
                { valueAsNumber: true }
              )}
              defaultValue={safeDefault(row.marks)}
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
        key: "remarks",
        label: "Remarks",
        render: (_value, row, index = 0) => {
          if (row?.isTotal) {
            return <span className="text-gray-500">-</span>;
          }

          if (disabled) {
            return (
              <span className="text-sm text-gray-600">
                {row.remarks || "-"}
              </span>
            );
          }

          return (
            <Input
              {...register(
                `campRowsByTerm.${currentTermKey}.0.activities.${index}.remark`
              )}
              defaultValue={safeDefault(row.remarks)}
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
          CAMP MARKS
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
