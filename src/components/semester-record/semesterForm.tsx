"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { UniversalTable, TableConfig } from "@/components/layout/TableLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getSpr, upsertSpr } from "@/app/lib/api/performanceRecordsApi";
import type { RootState } from "@/store";
import { saveMarksScored, saveRemark, saveReviews } from "@/store/slices/semesterRecordSlice";

type TableData = {
  id: string;
  column1: number;
  column2: string;
  column3: number;
  column4: string;
  column5: string;
};

type SprRow = {
  subjectKey: string;
  subjectLabel: string;
  maxMarks: number;
  marksScored: number;
  remarks?: string;
};

type RemarksData = {
  pc: string;
  dc: string;
  commander: string;
};

const baseTableConfig: TableConfig<TableData> = {
  columns: [
    { key: "column1", label: "S.No", sortable: true, width: "20%" },
    { key: "column2", label: "Subject", sortable: true, width: "20%" },
    { key: "column3", label: "Max Marks", type: "number", sortable: true, width: "20%" },
    { key: "column4", label: "Marks Scored", sortable: false, width: "20%" },
    { key: "column5", label: "Remarks", sortable: false, width: "20%" },
  ],
};

const tableConfigs: Record<string, TableConfig<TableData>> = {
  "I TERM": baseTableConfig,
  "II TERM": baseTableConfig,
  "III TERM": baseTableConfig,
  "IV TERM": baseTableConfig,
  "V TERM": baseTableConfig,
  "VI TERM": baseTableConfig,
};

const semesters = ["I TERM", "II TERM", "III TERM", "IV TERM", "V TERM", "VI TERM"];

function semesterLabelToNumber(label: string) {
  const idx = semesters.indexOf(label);
  return idx >= 0 ? idx + 1 : 1;
}

export default function SemesterForm() {
  const params = useParams();
  const paramId = params?.ocId || params?.id;
  const ocId = Array.isArray(paramId) ? paramId[0] : paramId ?? "";

  const dispatch = useDispatch();
  const [activeSemester, setActiveSemester] = useState("I TERM");
  const [isEditingRemarks, setIsEditingRemarks] = useState(false);
  const [isEditingReviews, setIsEditingReviews] = useState(false);
  const [loading, setLoading] = useState(false);

  const [rows, setRows] = useState<SprRow[]>([]);
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});
  const [cdrMarks, setCdrMarks] = useState("");
  const [localReviews, setLocalReviews] = useState<RemarksData>({
    pc: "",
    dc: "",
    commander: "",
  });

  const savedData = useSelector((state: RootState) =>
    state.semesterRecord.forms[ocId]?.[activeSemester]
  );

  useEffect(() => {
    if (!savedData) return;
    if (savedData.reviews) {
      setLocalReviews(savedData.reviews);
    }
    if (savedData.remarks) {
      setRemarksMap(savedData.remarks);
    }
    const cachedCdr = savedData.tableData?.cdr_marks;
    if (cachedCdr !== undefined) {
      setCdrMarks(cachedCdr);
    }
  }, [savedData]);

  const semesterNumber = useMemo(
    () => semesterLabelToNumber(activeSemester),
    [activeSemester]
  );

  const loadSpr = useCallback(async () => {
    if (!ocId) return;
    try {
      setLoading(true);
      const data: any = await getSpr(ocId, semesterNumber);
      const apiRows: SprRow[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(apiRows);

      const nextRemarks: Record<string, string> = {};
      let nextCdr = "";
      for (const r of apiRows) {
        nextRemarks[r.subjectKey] = r.remarks ?? "";
        dispatch(saveRemark({ ocId, semester: activeSemester, rowId: r.subjectKey, value: r.remarks ?? "" }));
        if (r.subjectKey === "cdr_marks") {
          nextCdr = r.marksScored !== undefined && r.marksScored !== null ? String(r.marksScored) : "";
        }
        dispatch(
          saveMarksScored({
            ocId,
            semester: activeSemester,
            rowId: r.subjectKey,
            value: r.marksScored !== undefined && r.marksScored !== null ? String(r.marksScored) : "",
          })
        );
      }
      setRemarksMap(nextRemarks);
      setCdrMarks(nextCdr);

      const pr = data?.performanceReportRemarks ?? {};
      setLocalReviews({
        pc: pr.platoonCommanderRemarks ?? "",
        dc: pr.deputyCommanderRemarks ?? "",
        commander: pr.commanderRemarks ?? "",
      });
      dispatch(
        saveReviews({
          ocId,
          semester: activeSemester,
          reviews: {
            pc: pr.platoonCommanderRemarks ?? "",
            dc: pr.deputyCommanderRemarks ?? "",
            commander: pr.commanderRemarks ?? "",
          },
        })
      );
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load SPR data");
    } finally {
      setLoading(false);
    }
  }, [activeSemester, dispatch, ocId, semesterNumber]);

  useEffect(() => {
    loadSpr();
  }, [loadSpr]);

  const derivedRows = useMemo(() => {
    if (rows.length === 0) return rows;
    const parsed = Number(cdrMarks);
    const hasCdr = cdrMarks.trim() !== "" && !Number.isNaN(parsed);
    const cdrOverride = hasCdr ? parsed : undefined;
    const withCdr = rows.map((r) => {
      if (r.subjectKey !== "cdr_marks") return r;
      const clamped = cdrOverride !== undefined ? Math.max(0, Math.min(r.maxMarks, cdrOverride)) : r.marksScored;
      return { ...r, marksScored: clamped };
    });
    const total = withCdr.reduce((acc, r) => {
      if (r.subjectKey === "total") return acc;
      return acc + Number(r.marksScored ?? 0);
    }, 0);
    return withCdr.map((r) => (r.subjectKey === "total" ? { ...r, marksScored: total } : r));
  }, [rows, cdrMarks]);

  const displaySemesterData: TableData[] = derivedRows.map((row, idx) => ({
    id: row.subjectKey,
    column1: idx + 1,
    column2: row.subjectLabel,
    column3: row.maxMarks,
    column4: row.marksScored !== undefined && row.marksScored !== null ? String(row.marksScored) : "",
    column5: remarksMap[row.subjectKey] ?? row.remarks ?? "",
  }));

  const handleRemarkChange = (subjectKey: string, value: string) => {
    setRemarksMap((prev) => ({ ...prev, [subjectKey]: value }));
    dispatch(saveRemark({ ocId, semester: activeSemester, rowId: subjectKey, value }));
  };

  const handleSaveRemarks = async () => {
    if (!ocId) return;
    const trimmed = cdrMarks.trim();
    const cdrValue = trimmed === "" ? undefined : Number(trimmed);
    if (trimmed !== "" && (Number.isNaN(cdrValue) || cdrValue < 0)) {
      toast.error("Cdr's Marks must be a valid number");
      return;
    }

    try {
      await upsertSpr(ocId, semesterNumber, {
        cdrMarks: cdrValue,
        subjectRemarks: remarksMap,
      });
      toast.success("Performance data saved successfully");
      setIsEditingRemarks(false);
      await loadSpr();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save performance data");
    }
  };

  const handleCancelRemarks = () => {
    setIsEditingRemarks(false);
    const nextRemarks: Record<string, string> = {};
    let nextCdr = "";
    for (const r of rows) {
      nextRemarks[r.subjectKey] = r.remarks ?? "";
      dispatch(saveRemark({ ocId, semester: activeSemester, rowId: r.subjectKey, value: r.remarks ?? "" }));
      if (r.subjectKey === "cdr_marks") {
        nextCdr = r.marksScored !== undefined && r.marksScored !== null ? String(r.marksScored) : "";
      }
      dispatch(
        saveMarksScored({
          ocId,
          semester: activeSemester,
          rowId: r.subjectKey,
          value: r.marksScored !== undefined && r.marksScored !== null ? String(r.marksScored) : "",
        })
      );
    }
    setRemarksMap(nextRemarks);
    setCdrMarks(nextCdr);
  };

  const handleReviewChange = (field: keyof RemarksData, value: string) => {
    const next = { ...localReviews, [field]: value };
    setLocalReviews(next);
    dispatch(saveReviews({ ocId, semester: activeSemester, reviews: next }));
  };

  const handleSaveReviews = async () => {
    if (!ocId) return;
    try {
      await upsertSpr(ocId, semesterNumber, {
        performanceReportRemarks: {
          platoonCommanderRemarks: localReviews.pc,
          deputyCommanderRemarks: localReviews.dc,
          commanderRemarks: localReviews.commander,
        },
      });
      toast.success("Reviews saved successfully");
      setIsEditingReviews(false);
      await loadSpr();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save reviews");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 rounded-2xl shadow-xl bg-white">
        <CardContent className="space-y-6">
          <div className="flex justify-center mb-6 space-x-2">
            {semesters.map((sem) => (
              <button
                key={sem}
                onClick={() => setActiveSemester(sem)}
                className={`px-4 py-2 rounded-t-lg font-medium ${
                  activeSemester === sem
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {sem}
              </button>
            ))}
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-center text-primary flex-1">
                {activeSemester} Performance Data
              </h2>
            </div>

            {loading ? (
              <p className="text-center text-sm text-gray-500">Loading...</p>
            ) : isEditingRemarks ? (
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
                      {derivedRows.map((row, idx) => {
                        const isCdr = row.subjectKey === "cdr_marks";
                        return (
                          <tr key={row.subjectKey} className="hover:bg-gray-50 border-b border-gray-300">
                            <td className="border border-gray-300 px-4 py-2">{idx + 1}</td>
                            <td className="border border-gray-300 px-4 py-2">{row.subjectLabel}</td>
                            <td className="border border-gray-300 px-4 py-2">{row.maxMarks}</td>
                            <td className="border border-gray-300 px-4 py-2">
                              {isCdr ? (
                                <Input
                                  value={cdrMarks}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setCdrMarks(value);
                                    dispatch(
                                      saveMarksScored({
                                        ocId,
                                        semester: activeSemester,
                                        rowId: "cdr_marks",
                                        value,
                                      })
                                    );
                                  }}
                                  placeholder="Enter marks"
                                  className="w-full"
                                />
                              ) : (
                                <Input
                                  value={
                                    row.marksScored !== undefined && row.marksScored !== null
                                      ? String(row.marksScored)
                                      : ""
                                  }
                                  readOnly
                                  className="w-full bg-gray-50"
                                />
                              )}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              <Input
                                value={remarksMap[row.subjectKey] ?? ""}
                                onChange={(e) => handleRemarkChange(row.subjectKey, e.target.value)}
                                placeholder="Enter remark"
                                className="w-full"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={handleCancelRemarks}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveRemarks}>Save</Button>
                </div>
              </div>
            ) : (
              <>
                <UniversalTable data={displaySemesterData} config={tableConfigs[activeSemester]} />
                <div className="flex justify-center mt-4">
                  <Button onClick={() => setIsEditingRemarks(true)}>Edit</Button>
                </div>
              </>
            )}
          </div>

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
                  <Button onClick={handleSaveReviews}>Save</Button>
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
