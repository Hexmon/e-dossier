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
    column2: "Total",
    column3: 12000,
    column4: "",
    column5: "",
    column6: "",
    column7: "",
    column8: "",
    column9: "",
    column10: "",
  },
  {
    id: "10",
    column1: 10,
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

export default function FinalPerformanceRecord() {
  
    const [finalData, setFinalData] = useState(initialFinalData);


  return (
  <div className="space-y-6">
    <Card className="p-6 rounded-2xl shadow-xl bg-white">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-center text-primary">Final Performance Record</CardTitle>
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
