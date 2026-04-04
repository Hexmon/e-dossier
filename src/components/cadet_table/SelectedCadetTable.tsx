// components/cadet_table/SelectedCadetTable.tsx
"use client";

import { Cadet } from "@/types/cadet";
import { useEffect, useState } from "react";
import PerformanceGraphModal from "@/components/performance_graph/PerformanceGraphModal";
import type { PerformanceGraphData } from "@/types/performanceGraph";
import { fetchOCById } from "@/app/lib/api/ocApi";

type CadetTableProps = {
  selectedCadet: Cadet | null;
  performanceData?: PerformanceGraphData | null;
};

export default function SelectedCadetTable({
  selectedCadet,
  performanceData,
}: CadetTableProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resolvedSemester, setResolvedSemester] = useState<number | null>(selectedCadet?.currentSemester ?? null);

  useEffect(() => {
    let cancelled = false;
    if (!selectedCadet) {
      setResolvedSemester(null);
      return () => {
        cancelled = true;
      };
    }

    setResolvedSemester(selectedCadet.currentSemester ?? null);

    if (selectedCadet.currentSemester != null || !selectedCadet.ocId) {
      return () => {
        cancelled = true;
      };
    }

    void fetchOCById(selectedCadet.ocId).then((oc) => {
      if (cancelled) return;
      setResolvedSemester(oc?.currentSemester ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedCadet]);

  if (!selectedCadet) return null;

  return (
    <>
      <div className="!sticky !top-16 !z-50 bg-card border border-border shadow-sm min-w-full mb-4 rounded-lg overflow-hidden">
        <table className="min-w-full text-sm text-foreground border-collapse">
          <thead className="bg-primary text-primary-foreground">
            <tr>
              <th className="px-6 py-3 text-center font-semibold border border-border">
                Selected Cadet
              </th>
              <th className="px-6 py-3 text-center font-semibold border border-border">
                Course
              </th>
              <th className="px-6 py-3 text-center font-semibold border border-border">
                OC Number
              </th>
              <th className="px-6 py-3 text-center font-semibold border border-border">
                Semester
              </th>
              <th className="px-6 py-3 text-center font-semibold border border-border">
                Performance Graph
              </th>
            </tr>
          </thead>
          <tbody className="bg-card text-center">
            <tr>
              <td className="px-6 py-3 border border-border">
                {selectedCadet.name}
              </td>
              <td className="px-6 py-3 border border-border">
                {selectedCadet.courseName}
              </td>
              <td className="px-6 py-3 border border-border">
                {selectedCadet.ocNumber}
              </td>
              <td className="px-6 py-3 border border-border">
                {resolvedSemester ?? "-"}
              </td>
              <td className="px-6 py-3 border border-border">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 bg-success text-primary-foreground font-medium rounded-lg transition-colors duration-200"
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
        ocId={selectedCadet.ocId}
        initialData={performanceData}
        cadetName={selectedCadet.name}
      />
    </>
  );
}
