"use client";

import React, { useState, useEffect } from "react";
import { UniversalTable, TableConfig } from "@/components/layout/TableLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface FinalTableData {
  id: string;
  column1: number;
  column2: string;
  column3: number;
  column4: string;
  column5: string;
  column6: string;
  column7: string;
  column8: string;
  column9: string;
  column10: string;
}

interface SemesterMarksData {
  SEM1: Record<string, string>;
  SEM2: Record<string, string>;
  SEM3: Record<string, string>;
  SEM4: Record<string, string>;
  SEM5: Record<string, string>;
  SEM6: Record<string, string>;
}

// Base table config – 10 columns
const finalTableConfig: TableConfig<FinalTableData> = {
  columns: [
    { key: "column1", label: "S.No", type: "number", sortable: true, width: "10%" },
    { key: "column2", label: "Subject", sortable: true, width: "20%" },
    { key: "column3", label: "Max Marks", type: "number", sortable: true, width: "12%" },
    { key: "column4", label: "I", sortable: false, width: "10%" },
    { key: "column5", label: "II", sortable: false, width: "10%" },
    { key: "column6", label: "III", sortable: false, width: "10%" },
    { key: "column7", label: "IV", sortable: false, width: "10%" },
    { key: "column8", label: "V", sortable: false, width: "10%" },
    { key: "column9", label: "VI", sortable: false, width: "10%" },
    { key: "column10", label: "Total", sortable: false, width: "20%" },
  ]
};

const initialFinalData: FinalTableData[] = [
  {
    id: "1",
    column1: 1,
    column2: "Academics (incl Service Sub)",
    column3: 8100,
    column4: "",
    column5: "",
    column6: "",
    column7: "",
    column8: "",
    column9: "",
    column10: "",
  },
  {
    id: "2",
    column1: 2,
    column2: "OLQ",
    column3: 1800,
    column4: "",
    column5: "",
    column6: "",
    column7: "",
    column8: "",
    column9: "",
    column10: "",
  },
  {
    id: "3",
    column1: 3,
    column2: "PT & Swimming",
    column3: 900,
    column4: "",
    column5: "",
    column6: "",
    column7: "",
    column8: "",
    column9: "",
    column10: "",
  },
  {
    id: "4",
    column1: 4,
    column2: "Games (incl X-Country)",
    column3: 600,
    column4: "",
    column5: "",
    column6: "",
    column7: "",
    column8: "",
    column9: "",
    column10: "",
  },
  {
    id: "5",
    column1: 5,
    column2: "Drill",
    column3: 90,
    column4: "",
    column5: "",
    column6: "",
    column7: "",
    column8: "",
    column9: "",
    column10: "",
  },
  {
    id: "6",
    column1: 6,
    column2: "Camp",
    column3: 210,
    column4: "",
    column5: "",
    column6: "",
    column7: "",
    column8: "",
    column9: "",
    column10: "",
  },
  {
    id: "7",
    column1: 7,
    column2: "CFE",
    column3: 150,
    column4: "",
    column5: "",
    column6: "",
    column7: "",
    column8: "",
    column9: "",
    column10: "",
  },
  {
    id: "8",
    column1: 8,
    column2: "Cdr's Marks",
    column3: 150,
    column4: "",
    column5: "",
    column6: "",
    column7: "",
    column8: "",
    column9: "",
    column10: "",
  },
  {
    id: "9",
    column1: 9,
    column2: "GRAND TOTAL",
    column3: 12000,
    column4: "",
    column5: "",
    column6: "",
    column7: "",
    column8: "",
    column9: "",
    column10: "",
  },
];

interface FinalPerformanceRecordProps {
  semesterMarksData?: SemesterMarksData;
}

export default function FinalPerformanceRecord({ semesterMarksData }: FinalPerformanceRecordProps) {
  const [finalData, setFinalData] = useState(initialFinalData);

  // Map semester marks to final table columns
  useEffect(() => {
    if (semesterMarksData) {
      const updatedData = initialFinalData.map((row) => ({
        ...row,
        column4: semesterMarksData.SEM1?.[row.id] || "",
        column5: semesterMarksData.SEM2?.[row.id] || "",
        column6: semesterMarksData.SEM3?.[row.id] || "",
        column7: semesterMarksData.SEM4?.[row.id] || "",
        column8: semesterMarksData.SEM5?.[row.id] || "",
        column9: semesterMarksData.SEM6?.[row.id] || "",
        column10: calculateTotal(
          semesterMarksData.SEM1?.[row.id],
          semesterMarksData.SEM2?.[row.id],
          semesterMarksData.SEM3?.[row.id],
          semesterMarksData.SEM4?.[row.id],
          semesterMarksData.SEM5?.[row.id],
          semesterMarksData.SEM6?.[row.id]
        ),
      }));
      setFinalData(updatedData);
    }
  }, [semesterMarksData]);

  // Calculate total across semesters
  const calculateTotal = (...marks: (string | undefined)[]): string => {
    const validMarks = marks
      .filter((m) => m !== undefined && m !== "")
      .map((m) => parseFloat(m || "0"))
      .filter((m) => !isNaN(m));

    if (validMarks.length === 0) return "";
    const total = validMarks.reduce((sum, mark) => sum + mark, 0);
    return total.toString();
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 rounded-2xl shadow-xl bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-center text-primary">
            Final Performance Record
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <UniversalTable data={finalData} config={finalTableConfig} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
