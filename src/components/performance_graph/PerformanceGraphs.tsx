// components/performance_graph/PerformanceGraphs.tsx
"use client";

import React from "react";
import AcademicsChart from "./Graph";
import OlqChart from "./OLQ_Graph";
import OdtChart from "./ODT_Graph";
import DisciplineChart from "./Discipline";
import MedGraph from "./Med_Graph";
import type { PerformanceGraphData } from "@/types/performanceGraph";

type Props = {
  data: PerformanceGraphData;
};

export default function PerformanceGraphs({ data }: Props) {
  return (
    <div className="space-y-6 p-4">
      <AcademicsChart
        data={data.academics.cadet}
        averageData={data.academics.courseAverage}
        cadetTermPresence={data.academics.cadetTermPresence}
      />
      <OlqChart data={data.olq.cadet} averageData={data.olq.courseAverage} cadetTermPresence={data.olq.cadetTermPresence} />
      <OdtChart data={data.odt.cadet} averageData={data.odt.courseAverage} cadetTermPresence={data.odt.cadetTermPresence} />
      <DisciplineChart data={data.discipline.cadet} averageData={data.discipline.courseAverage} cadetTermPresence={data.discipline.cadetTermPresence} />
      <MedGraph data={data.medical.cadet} averageData={data.medical.courseAverage} cadetTermPresence={data.medical.cadetTermPresence} />
    </div>
  );
}
