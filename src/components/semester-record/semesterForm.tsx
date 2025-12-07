"use client";

import React, { useState } from "react";
import { UniversalTable, TableConfig } from "@/components/layout/TableLayout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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

// Table config for all semesters - same columns
const tableConfigs: Record<string, TableConfig<TableData>> = {
  SEM1: baseTableConfig,
  SEM2: baseTableConfig,
  SEM3: baseTableConfig,
  SEM4: baseTableConfig,
  SEM5: baseTableConfig,
  SEM6: baseTableConfig,
};

export default function SemesterForm() {
  const [activeSemester, setActiveSemester] = useState("SEM1");
  const [isEditingRemarks, setIsEditingRemarks] = useState(false);
  const [isEditingReviews, setIsEditingReviews] = useState(false);

  const semesters = ["SEM1", "SEM2", "SEM3", "SEM4", "SEM5", "SEM6"];

  // Hardcoded performance data for each semester
  const semesterData: Record<string, TableData[]> = {
    SEM1: [
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
    SEM2: [
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
    SEM3: [
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
    SEM4: [
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
    SEM5: [
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
    SEM6: [
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

  // Edited remarks for performance table by semester & rowId
  const [editedRemarks, setEditedRemarks] = useState<Record<string, Record<string, string>>>({
    SEM1: {},
    SEM2: {},
    SEM3: {},
    SEM4: {},
    SEM5: {},
    SEM6: {},
  });

  // Reviews data for each semester
  const [reviews, setReviews] = useState<Record<string, RemarksData>>({
    SEM1: { pc: "", dc: "", commander: "" },
    SEM2: { pc: "", dc: "", commander: "" },
    SEM3: { pc: "", dc: "", commander: "" },
    SEM4: { pc: "", dc: "", commander: "" },
    SEM5: { pc: "", dc: "", commander: "" },
    SEM6: { pc: "", dc: "", commander: "" },
  });

//   const [isEditingRemarks, setIsEditingRemarks] = useState(false);
//   const [isEditingReviews, setIsEditingReviews] = useState(false);

  // Handlers for remarks edits
  const handleRemarkChange = (rowId: string, value: string) => {
    setEditedRemarks((prev) => ({
      ...prev,
      [activeSemester]: {
        ...prev[activeSemester],
        [rowId]: value,
      },
    }));
  };

  // Handlers for reviews edits
  const handleReviewChange = (field: keyof RemarksData, value: string) => {
    setReviews((prev) => ({
      ...prev,
      [activeSemester]: { ...prev[activeSemester], [field]: value },
    }));
  };

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

          {/* Performance Table */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-center text-primary">{activeSemester} Performance Data</h2>
            {isEditingRemarks ? (
              <div className="space-y-4">
                <div className="overflow-x-auto border border-gray-300 rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border border-gray-300 px-4 py-2 text-left">S.No</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Subject</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Max Marks</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {semesterData[activeSemester].map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50 border-b border-gray-300">
                          <td className="border border-gray-300 px-4 py-2">{row.column1}</td>
                          <td className="border border-gray-300 px-4 py-2">{row.column2}</td>
                          <td className="border border-gray-300 px-4 py-2">{row.column3}</td>
                          <td className="border border-gray-300 px-4 py-2">
                            <Input
                              value={editedRemarks[activeSemester]?.[row.id] ?? row.column5}
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
                  <Button
                    onClick={() => setIsEditingRemarks(false)}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <UniversalTable
                  data={semesterData[activeSemester]}
                  config={tableConfigs[activeSemester]}
                />
                <div className="flex justify-center mt-4">
                  <Button onClick={() => setIsEditingRemarks(true)}>Edit Remarks</Button>
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
                    value={reviews[activeSemester]?.pc || ""}
                    onChange={(e) => handleReviewChange("pc", e.target.value)}
                    placeholder="Enter Platoon Commander remarks"
                    rows={5}
                    className="min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">Deputy Commander</Label>
                  <Textarea
                    value={reviews[activeSemester]?.dc || ""}
                    onChange={(e) => handleReviewChange("dc", e.target.value)}
                    placeholder="Enter Deputy Commander remarks"
                    rows={5}
                    className="min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">Commander</Label>
                  <Textarea
                    value={reviews[activeSemester]?.commander || ""}
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
                  <Button onClick={() => setIsEditingReviews(false)}>Save </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <Label className="font-medium">Platoon Commander</Label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {reviews[activeSemester]?.pc || "-"}
                  </p>
                </div>
                <div>
                  <Label className="font-medium">Deputy Commander</Label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {reviews[activeSemester]?.dc || "-"}
                  </p>
                </div>
                <div>
                  <Label className="font-medium">Commander</Label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {reviews[activeSemester]?.commander || "-"}
                  </p>
                </div>
                <div className="flex justify-center mt-4">
                  <Button onClick={() => setIsEditingReviews(true)}>Edit </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
