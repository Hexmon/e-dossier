"use client";

import React, { useMemo, useEffect, useRef } from "react";
import { useFormContext, FieldValues } from "react-hook-form";
import { UniversalTable, TableConfig } from "@/components/layout/TableLayout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OcCampData } from "@/app/lib/api/campApi";

// ---------- Types ----------
interface FormActivity {
  trainingCampActivityId: string;
  name: string;
  marksScored: number | null;
  defaultMaxMarks: number;
  remark?: string | null;
  ocActivityId?: string; // ID from OC camp activities
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
  ocActivityId?: string;
};

interface OcCampActivitiesTableProps {
  camp: OcCampData; // This has marksScored from OC API
  availableActivities: Array<{
    id: string;
    name: string;
    defaultMaxMarks: number;
  }>;
  disabled?: boolean;
  campName: string;
}

export default function OcCampActivitiesTable({
  camp,
  availableActivities,
  disabled = false,
  campName,
}: OcCampActivitiesTableProps) {
  const { register, watch, setValue } = useFormContext<FormValues>();
  const initializedRef = useRef<Set<string>>(new Set());
  const lastCampIdRef = useRef<string | null>(null);

  // Watch this specific camp's data by campName
  const campFormRow = watch(`campsByName.${campName}`) as CampFormRow | undefined;
  const formActivities = campFormRow?.activities ?? [];

  // Initialize form activities for this specific camp
  useEffect(() => {
    if (!campName) return;


    // Create a unique key for this camp initialization
    const initKey = `${campName}-${camp?.ocCampId || camp?.id || 'new'}`;

    // Skip if already initialized
    if (initializedRef.current.has(initKey)) {
      return;
    }

    // If camp ID changed, we need to reinitialize (switching between camps)
    const campIdChanged = lastCampIdRef.current !== null &&
      lastCampIdRef.current !== (camp?.ocCampId || camp?.id || null);

    // Check if form data needs to be updated with API data
    const hasOcActivities = camp?.activities && camp.activities.length > 0;
    const formHasOcData = formActivities.length > 0 &&
      formActivities.some(fa => fa.ocActivityId !== undefined);


    // Skip only if we have form data AND it already includes OC data AND camp hasn't changed
    if (!campIdChanged && formActivities.length > 0 && formHasOcData) {
      return;
    }

    // Update last camp ID
    lastCampIdRef.current = camp?.ocCampId || camp?.id || null;

    // Mark as initialized
    initializedRef.current.add(initKey);

    // MERGE LOGIC: Combine training camp activities structure with OC camp scores
    if (availableActivities.length > 0) {

      // Create a map of OC camp activities by name for quick lookup
      const ocActivitiesMap = new Map(
        (camp?.activities || []).map(ocActivity => {
          return [
            ocActivity.name,
            {
              marksScored: ocActivity.marksScored,
              remark: ocActivity.remark,
              ocActivityId: ocActivity.id
            }
          ];
        })
      );


      // Merge: Use training camp structure + OC camp scores
      const mergedActivities: FormActivity[] = availableActivities.map((trainingActivity) => {
        const ocData = ocActivitiesMap.get(trainingActivity.name);

        return {
          trainingCampActivityId: trainingActivity.id,
          name: trainingActivity.name,
          marksScored: ocData?.marksScored ?? null, // Use OC score if exists
          defaultMaxMarks: trainingActivity.defaultMaxMarks, // Use training camp max marks
          remark: ocData?.remark || null,
          ocActivityId: ocData?.ocActivityId
        };
      });


      setValue(`campsByName.${campName}.activities`, mergedActivities, {
        shouldValidate: false,
        shouldDirty: false,
      });


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
    } else {
    }

  }, [campName, camp?.ocCampId, camp?.id, camp?.trainingCampId, camp?.year, camp?.activities, availableActivities, formActivities.length, setValue]);

  // Reset initialized flag when camp name changes
  useEffect(() => {
    return () => {
      lastCampIdRef.current = null;
    };
  }, [campName]);

  const activityData: ActivityRowData[] = useMemo(() => {

    let rows: ActivityRowData[] = [];

    // Use formActivities if they exist
    if (formActivities && formActivities.length > 0) {
      rows = formActivities.map((formAct) => {
        const row = {
          trainingCampActivityId: formAct.trainingCampActivityId || "",
          activityName: formAct.name || "",
          marksScored:
            formAct.marksScored !== null && formAct.marksScored !== undefined
              ? Number(formAct.marksScored)
              : 0,
          maxMarks: Number(formAct.defaultMaxMarks) || 0,
          remark: formAct.remark || "",
          ocActivityId: formAct.ocActivityId,
        };
        return row;
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
            <div className="flex flex-col gap-1">
              {/* Hidden fields to preserve activity metadata */}
              <input
                type="hidden"
                value={row.trainingCampActivityId}
                {...register(
                  `campsByName.${campName}.activities.${index}.trainingCampActivityId`
                )}
              />
              {row.ocActivityId && (
                <input
                  type="hidden"
                  value={row.ocActivityId}
                  {...register(
                    `campsByName.${campName}.activities.${index}.ocActivityId`
                  )}
                />
              )}
              <input
                type="hidden"
                value={row.activityName}
                {...register(`campsByName.${campName}.activities.${index}.name`)}
              />
              <input
                type="hidden"
                value={row.maxMarks}
                {...register(
                  `campsByName.${campName}.activities.${index}.defaultMaxMarks`
                )}
              />
              <Input
                type="number"
                min="0"
                max={row.maxMarks}
                {...register(
                  `campsByName.${campName}.activities.${index}.marksScored`,
                  {
                    setValueAs: (v) => {
                      // Handle empty string or invalid input
                      if (v === '' || v === null || v === undefined) return null;
                      const num = Number(v);
                      return isNaN(num) ? null : num;
                    }
                  }
                )}
                placeholder="0"
                className="w-20"
              />
            </div>
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
            return <span className="text-muted-foreground">-</span>;
          }

          if (disabled) {
            return (
              <span className="text-sm text-muted-foreground">
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
            <span className="text-sm font-normal text-muted-foreground ml-2">
              (View Mode)
            </span>
          ) : (
            <span className="text-sm font-normal text-primary ml-2">
              (Edit Mode)
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <UniversalTable data={activityData} config={tableConfig} />
    </Card>
  );
}