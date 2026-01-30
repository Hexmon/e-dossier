"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { UniversalTable, TableConfig } from "@/components/layout/TableLayout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { RootState } from "@/store";
import {
  saveMarksScored,
  saveRemark,
  saveReviews,
  clearSemesterData,
} from "@/store/slices/semesterRecordSlice";

interface TableData {
  id: string;
  column1: number;
  column2: string;
  column3: number;
  column4: string;
  column5: string;
}

interface RemarksData {
  pc: string;
  dc: string;
  commander: string;
}

// Base table config - same columns for all semesters
const baseTableConfig: TableConfig<TableData> = {
  columns: [
    { key: "column1", label: "S.No", sortable: true, width: "20%" },
    { key: "column2", label: "Subject", sortable: true, width: "20%" },
    { key: "column3", label: "Max Marks", type: "number", sortable: true, width: "20%" },
    { key: "column4", label: "Marks Scored", sortable: false, width: "20%" },
    { key: "column5", label: "Remarks", sortable: false, width: "20%" },
  ]
};

const tableConfigs: Record<string, TableConfig<TableData>> = {
  "I TERM": baseTableConfig,
  "II TERM": baseTableConfig,
  "III TERM": baseTableConfig,
  "IV TERM": baseTableConfig,
  "V TERM": baseTableConfig,
  "VI TERM": baseTableConfig,
};

// Hardcoded base performance data for each semester
const BASE_SEMESTER_DATA: Record<string, TableData[]> = {
  "I TERM": [
    { id: "1", column1: 1, column2: "Academics (incl Service Sub)", column3: 1350, column4: '', column5: "" },
    { id: "2", column1: 2, column2: "OLQ", column3: 300, column4: "", column5: "" },
    { id: "3", column1: 3, column2: "PT & Swimming", column3: 150, column4: "", column5: "" },
    { id: "4", column1: 4, column2: "Games (incl X-Country)", column3: 100, column4: "", column5: "" },
    { id: "5", column1: 5, column2: "Drill", column3: 0, column4: "", column5: "" },
    { id: "6", column1: 6, column2: "Camp", column3: 0, column4: "", column5: "" },
    { id: "7", column1: 7, column2: "CFE", column3: 25, column4: "", column5: "" },
    { id: "8", column1: 8, column2: "Cdr's Marks", column3: 25, column4: "", column5: "" },
    { id: "9", column1: 9, column2: "TOTAL", column3: 1950, column4: "", column5: "" },
  ],
  "II TERM": [
    { id: "1", column1: 1, column2: "Academics (incl Service Sub)", column3: 1350, column4: "", column5: "" },
    { id: "2", column1: 2, column2: "OLQ", column3: 300, column4: "", column5: "" },
    { id: "3", column1: 3, column2: "PT & Swimming", column3: 150, column4: "", column5: "" },
    { id: "4", column1: 4, column2: "Games (incl X-Country)", column3: 100, column4: "", column5: "" },
    { id: "5", column1: 5, column2: "Drill", column3: 0, column4: "", column5: "" },
    { id: "6", column1: 6, column2: "Camp", column3: 0, column4: "", column5: "" },
    { id: "7", column1: 7, column2: "CFE", column3: 25, column4: "", column5: "" },
    { id: "8", column1: 8, column2: "Cdr's Marks", column3: 25, column4: "", column5: "" },
    { id: "9", column1: 9, column2: "TOTAL", column3: 1950, column4: "", column5: "" },
  ],
  "III TERM": [
    { id: "1", column1: 1, column2: "Academics (incl Service Sub)", column3: 1350, column4: "", column5: "" },
    { id: "2", column1: 2, column2: "OLQ", column3: 300, column4: "", column5: "" },
    { id: "3", column1: 3, column2: "PT & Swimming", column3: 150, column4: "", column5: "" },
    { id: "4", column1: 4, column2: "Games (incl X-Country)", column3: 100, column4: "", column5: "" },
    { id: "5", column1: 5, column2: "Drill", column3: 0, column4: "", column5: "" },
    { id: "6", column1: 6, column2: "Camp", column3: 0, column4: "", column5: "" },
    { id: "7", column1: 7, column2: "CFE", column3: 25, column4: "", column5: "" },
    { id: "8", column1: 8, column2: "Cdr's Marks", column3: 25, column4: "", column5: "" },
    { id: "9", column1: 9, column2: "TOTAL", column3: 1950, column4: "", column5: "" },
  ],
  "IV TERM": [
    { id: "1", column1: 1, column2: "Academics (incl Service Sub)", column3: 1350, column4: "", column5: "" },
    { id: "2", column1: 2, column2: "OLQ", column3: 300, column4: "", column5: "" },
    { id: "3", column1: 3, column2: "PT & Swimming", column3: 150, column4: "", column5: "" },
    { id: "4", column1: 4, column2: "Games (incl X-Country)", column3: 100, column4: "", column5: "" },
    { id: "5", column1: 5, column2: "Drill", column3: 25, column4: "", column5: "" },
    { id: "6", column1: 6, column2: "Camp", column3: 0, column4: "", column5: "" },
    { id: "7", column1: 7, column2: "CFE", column3: 25, column4: "", column5: "" },
    { id: "8", column1: 8, column2: "Cdr's Marks", column3: 25, column4: "", column5: "" },
    { id: "9", column1: 9, column2: "TOTAL", column3: 1975, column4: "", column5: "" },
  ],
  "V TERM": [
    { id: "1", column1: 1, column2: "Academics (incl Service Sub)", column3: 1350, column4: "", column5: "" },
    { id: "2", column1: 2, column2: "OLQ", column3: 300, column4: "", column5: "" },
    { id: "3", column1: 3, column2: "PT & Swimming", column3: 150, column4: "", column5: "" },
    { id: "4", column1: 4, column2: "Games (incl X-Country)", column3: 100, column4: "", column5: "" },
    { id: "5", column1: 5, column2: "Drill", column3: 25, column4: "", column5: "" },
    { id: "6", column1: 6, column2: "Camp", column3: 100, column4: "", column5: "" },
    { id: "7", column1: 7, column2: "CFE", column3: 25, column4: "", column5: "" },
    { id: "8", column1: 8, column2: "Cdr's Marks", column3: 25, column4: "", column5: "" },
    { id: "9", column1: 9, column2: "TOTAL", column3: 2075, column4: "", column5: "" },
  ],
  "VI TERM": [
    { id: "1", column1: 1, column2: "Academics (incl Service Sub)", column3: 1350, column4: "", column5: "" },
    { id: "2", column1: 2, column2: "OLQ", column3: 300, column4: "", column5: "" },
    { id: "3", column1: 3, column2: "PT & Swimming", column3: 150, column4: "", column5: "" },
    { id: "4", column1: 4, column2: "Games (incl X-Country)", column3: 100, column4: "", column5: "" },
    { id: "5", column1: 5, column2: "Drill", column3: 40, column4: "", column5: "" },
    { id: "6", column1: 6, column2: "Camp", column3: 110, column4: "", column5: "" },
    { id: "7", column1: 7, column2: "CFE", column3: 25, column4: "", column5: "" },
    { id: "8", column1: 8, column2: "Cdr's Marks", column3: 25, column4: "", column5: "" },
    { id: "9", column1: 9, column2: "TOTAL", column3: 2100, column4: "", column5: "" },
  ],
};

export default function SemesterForm() {
  const params = useParams();
  const paramId = params?.ocId || params?.id;
  const ocId = Array.isArray(paramId) ? paramId[0] : paramId ?? "";

  const dispatch = useDispatch();
  const [activeSemester, setActiveSemester] = useState("I TERM");
  const [isEditingRemarks, setIsEditingRemarks] = useState(false);
  const [isEditingReviews, setIsEditingReviews] = useState(false);

  const semesters = ["I TERM", "II TERM", "III TERM", "IV TERM", "V TERM", "VI TERM"];

  // Get saved data from Redux
  const savedData = useSelector((state: RootState) =>
    state.semesterRecord.forms[ocId]?.[activeSemester]
  );

  // Local state for reviews (with debounce)
  const [localReviews, setLocalReviews] = useState<RemarksData>({
    pc: "",
    dc: "",
    commander: "",
  });

  // Debounce timer refs
  const marksDebounceRef = useRef<Record<string, NodeJS.Timeout>>({});
  const remarksDebounceRef = useRef<Record<string, NodeJS.Timeout>>({});
  const reviewsDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved reviews when semester changes
  useEffect(() => {
    if (savedData?.reviews) {
      setLocalReviews(savedData.reviews);
    } else {
      setLocalReviews({ pc: "", dc: "", commander: "" });
    }
  }, [activeSemester, savedData]);

  // Handler for marks scored with auto-save
  const handleMarksScoreChange = (rowId: string, value: string) => {
    const row = BASE_SEMESTER_DATA[activeSemester].find(r => r.id === rowId);
    if (!row) return;

    const marksValue = parseFloat(value);

    // Allow empty values
    if (value.trim() !== "") {
      // Validate marks
      if (isNaN(marksValue) || marksValue < 0) {
        toast.error("Marks must be a valid positive number");
        return;
      }

      if (marksValue > row.column3) {
        toast.error(`Marks scored cannot exceed maximum marks (${row.column3})`);
        return;
      }
    }

    // Clear existing timeout for this row
    if (marksDebounceRef.current[rowId]) {
      clearTimeout(marksDebounceRef.current[rowId]);
    }

    // Set new timeout for auto-save
    marksDebounceRef.current[rowId] = setTimeout(() => {
      dispatch(saveMarksScored({
        ocId,
        semester: activeSemester,
        rowId,
        value,
      }));
    }, 500);
  };

  // Handler for remarks with auto-save
  const handleRemarkChange = (rowId: string, value: string) => {
    // Clear existing timeout for this row
    if (remarksDebounceRef.current[rowId]) {
      clearTimeout(remarksDebounceRef.current[rowId]);
    }

    // Set new timeout for auto-save
    remarksDebounceRef.current[rowId] = setTimeout(() => {
      dispatch(saveRemark({
        ocId,
        semester: activeSemester,
        rowId,
        value,
      }));
    }, 500);
  };

  // Handler for reviews with auto-save
  const handleReviewChange = (field: keyof RemarksData, value: string) => {
    const newReviews = { ...localReviews, [field]: value };
    setLocalReviews(newReviews);

    // Clear existing timeout
    if (reviewsDebounceRef.current) {
      clearTimeout(reviewsDebounceRef.current);
    }

    // Set new timeout for auto-save
    reviewsDebounceRef.current = setTimeout(() => {
      dispatch(saveReviews({
        ocId,
        semester: activeSemester,
        reviews: newReviews,
      }));
    }, 500);
  };

  // Derived data for display: base semester data merged with Redux data
  const displaySemesterData: TableData[] = BASE_SEMESTER_DATA[activeSemester].map((row) => ({
    ...row,
    column4: savedData?.tableData?.[row.id] ?? row.column4,
    column5: savedData?.remarks?.[row.id] ?? row.column5,
  }));

  const handleSaveRemarks = () => {
    // Validate all marks before saving
    if (!savedData?.tableData) {
      setIsEditingRemarks(false);
      toast.success("Performance data saved successfully");
      return;
    }

    const currentTableData = savedData.tableData;

    for (const [rowId, marksValue] of Object.entries(currentTableData)) {
      if (marksValue.trim() === "") continue;

      const row = BASE_SEMESTER_DATA[activeSemester].find(r => r.id === rowId);
      if (!row) continue;

      const marksNum = parseFloat(marksValue);
      if (isNaN(marksNum) || marksNum < 0 || marksNum > row.column3) {
        toast.error(`Invalid marks for row: ${row.column2}. Marks must be between 0 and ${row.column3}`);
        return;
      }
    }

    setIsEditingRemarks(false);
    toast.success("Performance data saved successfully");
  };

  const handleClearSemester = () => {
    if (confirm(`Are you sure you want to clear all data for ${activeSemester}?`)) {
      dispatch(clearSemesterData({ ocId, semester: activeSemester }));
      toast.info(`${activeSemester} data cleared`);
    }
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(marksDebounceRef.current).forEach(clearTimeout);
      Object.values(remarksDebounceRef.current).forEach(clearTimeout);
      if (reviewsDebounceRef.current) {
        clearTimeout(reviewsDebounceRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <Card className="p-6 rounded-2xl shadow-xl bg-white">
        <CardContent className="space-y-6">
          {/* Semester Tabs */}
          <div className="flex justify-center mb-6 space-x-2">
            {semesters.map((sem) => (
              <button
                key={sem}
                onClick={() => setActiveSemester(sem)}
                className={`px-4 py-2 rounded-t-lg font-medium ${activeSemester === sem
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700"
                  }`}
              >
                {sem}
              </button>
            ))}
          </div>

          {/* Auto-save indicator */}
          {(isEditingRemarks || isEditingReviews) && (
            <div className="text-xs text-gray-500 text-center">
              ✓ Changes are saved automatically
            </div>
          )}

          {/* Performance Table */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-center text-primary flex-1">
                {activeSemester} Performance Data
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSemester}
                className="text-destructive hover:bg-destructive hover:text-white"
              >
                Clear Data
              </Button>
            </div>

            {isEditingRemarks ? (
              <div className="space-y-4">
                <div className="overflow-x-auto border border-gray-300 rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border border-gray-300 px-4 py-2 text-left">S.No</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Subject</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Max Marks</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Marks Scored</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {BASE_SEMESTER_DATA[activeSemester].map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50 border-b border-gray-300">
                          <td className="border border-gray-300 px-4 py-2">{row.column1}</td>
                          <td className="border border-gray-300 px-4 py-2">{row.column2}</td>
                          <td className="border border-gray-300 px-4 py-2">{row.column3}</td>
                          <td className="border border-gray-300 px-4 py-2">
                            <Input
                              defaultValue={savedData?.tableData?.[row.id] ?? row.column4}
                              onChange={(e) => handleMarksScoreChange(row.id, e.target.value)}
                              placeholder="Enter marks scored"
                              className="w-full"
                            />
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            <Input
                              defaultValue={savedData?.remarks?.[row.id] ?? row.column5}
                              onChange={(e) => handleRemarkChange(row.id, e.target.value)}
                              placeholder="Enter remark"
                              className="w-full"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditingRemarks(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveRemarks}>
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <UniversalTable
                  data={displaySemesterData}
                  config={tableConfigs[activeSemester]}
                />
                <div className="flex justify-center mt-4">
                  <Button onClick={() => setIsEditingRemarks(true)}>Edit</Button>
                </div>
              </>
            )}
          </div>

          {/* Semester Reviews */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-center text-primary">Performance Report</h2>
            {isEditingReviews ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-medium">Platoon Commander</Label>
                  <Textarea
                    value={localReviews.pc}
                    onChange={(e) => handleReviewChange("pc", e.target.value)}
                    placeholder="Enter Platoon Commander remarks"
                    rows={5}
                    className="min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">Deputy Commander</Label>
                  <Textarea
                    value={localReviews.dc}
                    onChange={(e) => handleReviewChange("dc", e.target.value)}
                    placeholder="Enter Deputy Commander remarks"
                    rows={5}
                    className="min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">Commander</Label>
                  <Textarea
                    value={localReviews.commander}
                    onChange={(e) => handleReviewChange("commander", e.target.value)}
                    placeholder="Enter Commander remarks"
                    rows={5}
                    className="min-h-[120px]"
                  />
                </div>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => setIsEditingReviews(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    setIsEditingReviews(false);
                    toast.success("Reviews saved successfully");
                  }}>
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <Label className="font-medium">Platoon Commander</Label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {localReviews.pc || "-"}
                  </p>
                </div>
                <div>
                  <Label className="font-medium">Deputy Commander</Label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {localReviews.dc || "-"}
                  </p>
                </div>
                <div>
                  <Label className="font-medium">Commander</Label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {localReviews.commander || "-"}
                  </p>
                </div>
                <div className="flex justify-center mt-4">
                  <Button onClick={() => setIsEditingReviews(true)}>Edit</Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}