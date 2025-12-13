// components/cadet_table/SelectedCadetTable.tsx
"use client";

import { Cadet } from "@/types/cadet";
import { useState } from "react";
import PerformanceGraphModal from "@/components/performance_graph/PerformanceGraphModal";
import { data as getPerformanceData } from "@/components/performance_graph/Data";

type CadetTableProps = {
  selectedCadet: Cadet | null;
  academicsData?: number[];
  olqData?: number[];
  odtData?: number[];
  disciplineData?: number[];
};

export default function SelectedCadetTable({
  selectedCadet,
  academicsData = [],
  olqData = [],
  odtData = [],
  disciplineData = [],
}: CadetTableProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!selectedCadet) return null;

  const performanceData = getPerformanceData(selectedCadet.ocId);

  return (
    <>
      <div className="sticky top-16 z-50 bg-white border border-gray-200 shadow-sm min-w-full mb-4 rounded-lg overflow-hidden">
        <table className="min-w-full text-sm text-gray-700 border-collapse">
          <thead className="bg-blue-100 text-blue-700">
            <tr>
              <th className="px-6 py-3 text-center font-semibold border border-gray-300">
                Selected Cadet
              </th>
              <th className="px-6 py-3 text-center font-semibold border border-gray-300">
                Course
              </th>
              <th className="px-6 py-3 text-center font-semibold border border-gray-300">
                OC Number
              </th>
              <th className="px-6 py-3 text-center font-semibold border border-gray-300">
                Performance Graph
              </th>
            </tr>
          </thead>
          <tbody className="bg-white text-center">
            <tr>
              <td className="px-6 py-3 border border-gray-300">
                {selectedCadet.name}
              </td>
              <td className="px-6 py-3 border border-gray-300">
                {selectedCadet.courseName}
              </td>
              <td className="px-6 py-3 border border-gray-300">
                {selectedCadet.ocNumber}
              </td>
              <td className="px-6 py-3 border border-gray-300">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                >
                  View Graphs
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PerformanceGraphModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cadetName={selectedCadet.name}
        academicsData={performanceData?.academics ?? []}
        olqData={performanceData?.olq ?? []}
        odtData={performanceData?.odt ?? []}
        disciplineData={performanceData?.discipline ?? []}
      />
    </>
  );
}
