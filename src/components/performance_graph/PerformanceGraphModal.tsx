// components/performance_graph/PerformanceGraphModal.tsx
"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import PerformanceGraphs from "./PerformanceGraphs";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  academicsData: number[];
  olqData: number[];
  odtData: number[];
  disciplineData: number[];
  cadetName: string;
};

export default function PerformanceGraphModal({
  isOpen,
  onClose,
  academicsData,
  olqData,
  odtData,
  disciplineData,
  cadetName,
}: Props) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
      // Hide tabs when modal is open
      const tabsContainer = document.querySelector('[role="tablist"]');
      if (tabsContainer) {
        (tabsContainer as HTMLElement).style.visibility = "hidden";
      }
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
      // Show tabs when modal closes
      const tabsContainer = document.querySelector('[role="tablist"]');
      if (tabsContainer) {
        (tabsContainer as HTMLElement).style.visibility = "visible";
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-gray-900 bg-opacity-30 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6 pt-15">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Performance Graphs</h2>
              <p className="text-sm text-gray-600 mt-1">{cadetName}</p>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              aria-label="Close modal"
            >
              <X className="h-6 w-6 text-gray-600" />
            </button>
          </div>

          <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
            <PerformanceGraphs
              academicsData={academicsData}
              olqData={olqData}
              odtData={odtData}
              disciplineData={disciplineData}
            />
          </div>

          <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
