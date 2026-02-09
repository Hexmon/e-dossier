"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { UniversalTable, TableConfig } from "@/components/layout/TableLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { getFpr } from "@/app/lib/api/performanceRecordsApi";

type FinalTableData = {
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
};

type FprRow = {
  subjectKey: string;
  subjectLabel: string;
  maxMarks: number;
  marksBySemester?: number[];
  marksScored: number;
};

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
  ],
};

export default function FinalPerformanceRecord() {
  const params = useParams();
  const paramId = params?.ocId || params?.id;
  const ocId = Array.isArray(paramId) ? paramId[0] : paramId ?? "";

  const [finalData, setFinalData] = useState<FinalTableData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!ocId) return;
      try {
        setLoading(true);
        const data: any = await getFpr(ocId);
        const rows: FprRow[] = Array.isArray(data?.rows) ? data.rows : [];

        const mapped = rows.map((row, idx) => {
          const m = row.marksBySemester ?? [];
          const get = (i: number) => (m[i] === undefined || m[i] === null ? "" : String(m[i]));
          return {
            id: row.subjectKey,
            column1: idx + 1,
            column2: row.subjectLabel,
            column3: row.maxMarks,
            column4: get(0),
            column5: get(1),
            column6: get(2),
            column7: get(3),
            column8: get(4),
            column9: get(5),
            column10: row.marksScored !== undefined && row.marksScored !== null ? String(row.marksScored) : "",
          };
        });

        setFinalData(mapped);
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to load FPR data");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [ocId]);

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
            {loading ? (
              <p className="text-center text-sm text-gray-500">Loading...</p>
            ) : (
              <UniversalTable data={finalData} config={finalTableConfig} />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
