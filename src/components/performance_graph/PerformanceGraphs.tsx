// components/performance_graph/PerformanceGraphs.tsx
"use client";

import React from "react";
import AcademicsChart from "./Graph";
import OlqChart from "./OLQ_Graph";
import OdtChart from "./ODT_Graph";
import DisciplineChart from "./Discipline";

type Props = {
  academicsData: number[];
  olqData: number[];
  odtData: number[];
  disciplineData: number[];
};

export default function PerformanceGraphs({
  academicsData,
  olqData,
  odtData,
  disciplineData,
}: Props) {
  return (
    <div className="space-y-6 p-4">
      <AcademicsChart data={academicsData} />
      <OlqChart data={olqData} />
      <OdtChart data={odtData} />
      <DisciplineChart data={disciplineData} />
    </div>
  );
}
