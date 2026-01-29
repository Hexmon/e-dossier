"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UniversalTable, TableColumn, TableConfig } from "@/components/layout/TableLayout";
import { toast } from "sonner";
import MotivationAwards from "./MotivationAwards";
import IpetForm from "./IpetForm";
import GrandTotal from "./GrandTotal";
import HigherTests from "./HigherTests";
import Swimming from "./Swimming";
import { resolveTemplatesByType, ResolvedTemplateType, buildPTTableRows, PTTableRow } from "./ptTableHelpers";
import { usePhysicalTraining, PhysicalTrainingScore } from "@/hooks/usePhysicalTraining";

interface PhysicalFormProps {
  ocId: string;
}

const semesterToApiSemester: Record<string, number> = {
  "I TERM": 1,
  "II TERM": 2,
  "III TERM": 3,
  "IV TERM": 4,
  "V TERM": 5,
  "VI TERM": 6,
};

const isVirtualId = (id?: string) => !!id && id.startsWith("virtual:");

export default function PhysicalForm({ ocId }: PhysicalFormProps) {
  const [activeSemester, setActiveSemester] = useState("I TERM");
  const [isEditing, setIsEditing] = useState(false);
  const semesters = ["I TERM", "II TERM", "III TERM", "IV TERM", "V TERM", "VI TERM"];

  const {
    scores: apiScores,
    templatesByType,
    templateMetaByType,
    motivationFields,
    fetchScores,
    updateScores,
  } = usePhysicalTraining(ocId);

  const scoreById = useMemo(() => {
    const map = new Map<string, PhysicalTrainingScore>();
    apiScores.forEach((score) => map.set(score.ptTaskScoreId, score));
    return map;
  }, [apiScores]);

  const availableTypes = useMemo(() => {
    if (!templatesByType || !templateMetaByType) return {};
    const types: Record<string, ResolvedTemplateType> = {};
    Object.keys(templatesByType).forEach((key) => {
      const rows = templatesByType[key];
      const meta = templateMetaByType[key];
      if (rows && meta) {
        types[key] = {
          code: key,
          title: meta.title,
          maxTotalMarks: meta.maxTotalMarks,
          semester: meta.semester,
          rows,
        };
      }
    });
    return types;
  }, [templatesByType, templateMetaByType]);

  const pptType = useMemo<ResolvedTemplateType | null>(() => {
    const semesterNum = semesterToApiSemester[activeSemester];
    const types = Object.values(availableTypes);

    const explicitPPT = resolveTemplatesByType(templatesByType, templateMetaByType, "PPT");
    if (explicitPPT) {
      const filteredRows = semesterNum ? explicitPPT.rows.filter((r) => r.semester === semesterNum) : explicitPPT.rows;
      return { ...explicitPPT, rows: filteredRows };
    }

    const prioritized = types.filter((type) => {
      const title = type.title?.toLowerCase() ?? "";
      const code = type.code?.toLowerCase() ?? "";
      return title.includes("ppt") || title.includes("physical") || code.includes("ppt") || code.includes("physical");
    });

    if (prioritized.length > 0) {
      const candidate =
        semesterNum
          ? prioritized.find((t) => t.rows.some((r) => r.semester === semesterNum)) ?? prioritized[0]
          : prioritized[0];

      return { ...candidate, rows: semesterNum ? candidate.rows.filter((r) => r.semester === semesterNum) : candidate.rows };
    }

    return types.length > 0 ? types[0] : null;
  }, [availableTypes, templatesByType, templateMetaByType, activeSemester]);

  const ipetType = useMemo<ResolvedTemplateType | null>(() => {
    return Object.values(availableTypes).find((t) => t.title?.toLowerCase().includes("ipet") || t.code?.toLowerCase().includes("ipet")) || null;
  }, [availableTypes]);

  const swimmingType = useMemo<ResolvedTemplateType | null>(() => {
    return Object.values(availableTypes).find((t) => t.title?.toLowerCase().includes("swim") || t.code?.toLowerCase().includes("swim")) || null;
  }, [availableTypes]);

  const higherTestType = useMemo<ResolvedTemplateType | null>(() => {
    return Object.values(availableTypes).find((t) => t.title?.toLowerCase().includes("higher") || t.code?.toLowerCase().includes("higher")) || null;
  }, [availableTypes]);

  const [childComponentMarks, setChildComponentMarks] = useState<Record<string, number>>({
    ipet: 0,
    swimming: 0,
    higherTests: 0,
  });

  const [semesterTableData, setSemesterTableData] = useState<Record<string, PTTableRow[]>>(() => {
    const data: Record<string, PTTableRow[]> = {};
    semesters.forEach((s) => (data[s] = []));
    return data;
  });

  useEffect(() => {
    const semesterNum = semesterToApiSemester[activeSemester];
    if (semesterNum) fetchScores(semesterNum);
  }, [activeSemester, fetchScores]);

  useEffect(() => {
    setSemesterTableData((prev) => {
      const updated = { ...prev };
      const semesterNum = semesterToApiSemester[activeSemester];
      if (!semesterNum) return updated;

      const templateRows = pptType?.rows ?? [];
      const tableRows = buildPTTableRows(templateRows, semesterNum, scoreById);

      const totalMaxMarks = tableRows.reduce((sum, r) => sum + (r.column3 || 0), 0);
      const totalMarks = tableRows.reduce((sum, r) => sum + (r.column6 || 0), 0);

      const totalRow: PTTableRow = {
        id: `total-${activeSemester}`,
        column1: "—",
        column2: "Total",
        column3: totalMaxMarks,
        column4: "",
        column5: "",
        column6: totalMarks,
        attemptGroups: [],
        selectedAttempt: "",
        selectedGrade: "",
        selectedScoreId: "",
      };

      updated[activeSemester] = tableRows.length ? [...tableRows, totalRow] : [];
      return updated;
    });
  }, [pptType, activeSemester, scoreById]);

  const nonTotalRows = useMemo(() => {
    const rows = semesterTableData[activeSemester] || [];
    return rows.filter((r) => !r.id.startsWith("total-"));
  }, [semesterTableData, activeSemester]);

  const totalMarksObtained = useMemo(() => nonTotalRows.reduce((sum, r) => sum + (r.column6 || 0), 0), [nonTotalRows]);
  const pptTableMaxMarks = useMemo(() => nonTotalRows.reduce((sum, r) => sum + (r.column3 || 0), 0), [nonTotalRows]);

  const grandTotalMarks = useMemo(() => {
    return totalMarksObtained + (childComponentMarks.ipet || 0) + (childComponentMarks.swimming || 0) + (childComponentMarks.higherTests || 0);
  }, [totalMarksObtained, childComponentMarks]);

  const handleAttemptChange = useCallback(
    (rowId: string, attemptCode: string) => {
      setSemesterTableData((prev) => ({
        ...prev,
        [activeSemester]: prev[activeSemester].map((row) => {
          if (row.id !== rowId || row.id.startsWith("total-")) return row;

          const attemptGroup = row.attemptGroups.find((g) => g.attemptCode === attemptCode);
          const nextGrade = attemptGroup?.grades[0];
          const nextScoreId = nextGrade?.scoreId ?? row.selectedScoreId;

          const marks = nextScoreId ? scoreById.get(nextScoreId)?.marksScored ?? 0 : row.column6;
          const maxMarks = nextGrade?.maxMarks ?? row.column3; // ✅ from template maxMarks

          return {
            ...row,
            selectedAttempt: attemptCode,
            column4: attemptCode,
            selectedGrade: nextGrade?.gradeCode ?? row.selectedGrade,
            column5: nextGrade?.gradeCode ?? row.column5,
            selectedScoreId: nextScoreId,
            column3: maxMarks,
            column6: marks,
          };
        }),
      }));
    },
    [activeSemester, scoreById]
  );

  const handleGradeChange = useCallback(
    (rowId: string, gradeCode: string) => {
      setSemesterTableData((prev) => ({
        ...prev,
        [activeSemester]: prev[activeSemester].map((row) => {
          if (row.id !== rowId || row.id.startsWith("total-")) return row;

          const attemptGroup = row.attemptGroups.find((g) => g.attemptCode === row.selectedAttempt);
          const grade = attemptGroup?.grades.find((g) => g.gradeCode === gradeCode);
          const nextScoreId = grade?.scoreId ?? row.selectedScoreId;

          const marks = nextScoreId ? scoreById.get(nextScoreId)?.marksScored ?? 0 : row.column6;
          const maxMarks = grade?.maxMarks ?? row.column3;

          return {
            ...row,
            selectedGrade: gradeCode,
            column5: gradeCode,
            selectedScoreId: nextScoreId,
            column3: maxMarks,
            column6: marks,
          };
        }),
      }));
    },
    [activeSemester, scoreById]
  );

  const handleMarksChange = useCallback(
    (rowId: string, value: string) => {
      setSemesterTableData((prev) => ({
        ...prev,
        [activeSemester]: prev[activeSemester].map((row) => {
          if (row.id !== rowId || row.id.startsWith("total-")) return row;

          if (isVirtualId(row.selectedScoreId)) {
            toast.error("This template has no scoreId from server, so marks cannot be saved yet.");
            return row;
          }

          if (value.trim() === "") return { ...row, column6: 0 };

          const numValue = parseFloat(value);
          if (isNaN(numValue) || numValue < 0) {
            toast.error("Marks must be a valid positive number");
            return row;
          }
          if (numValue > row.column3) {
            toast.error(`Marks scored cannot exceed maximum marks (${row.column3})`);
            return row;
          }

          return { ...row, column6: numValue };
        }),
      }));
    },
    [activeSemester]
  );

  const handleSave = useCallback(async () => {
    const semesterNum = semesterToApiSemester[activeSemester];
    if (!semesterNum) return;

    const rows = semesterTableData[activeSemester] || [];
    const dataRows = rows.filter((r) => !r.id.startsWith("total-"));

    for (const row of dataRows) {
      if (!isVirtualId(row.selectedScoreId) && row.column6 > row.column3) {
        toast.error(`Invalid marks for ${row.column2}. Marks must be between 0 and ${row.column3}`);
        return;
      }
    }

    const scoresForApi = dataRows
      .filter((row) => row.selectedScoreId && !isVirtualId(row.selectedScoreId))
      .map((row) => ({
        ptTaskScoreId: row.selectedScoreId,
        marksScored: row.column6 || 0,
        attemptCode: row.selectedAttempt,
        gradeCode: row.selectedGrade,
      }));

    if (scoresForApi.length === 0) {
      toast.error("No valid server scoreIds found to save. (Template response returned scoreId: null)");
      return;
    }

    await updateScores(semesterNum, scoresForApi);
    setIsEditing(false);
    toast.success("PPT data saved successfully");
  }, [semesterTableData, activeSemester, updateScores]);

  const handleIpetMarks = useCallback((marks: number) => setChildComponentMarks((p) => (p.ipet === marks ? p : { ...p, ipet: marks })), []);
  const handleSwimmingMarks = useCallback((marks: number) => setChildComponentMarks((p) => (p.swimming === marks ? p : { ...p, swimming: marks })), []);
  const handleHigherTestsMarks = useCallback((marks: number) => setChildComponentMarks((p) => (p.higherTests === marks ? p : { ...p, higherTests: marks })), []);

  // ✅ PPT columns: S.No, Test, Category, Status, Max Marks, Marks Scored
  const columns: TableColumn<PTTableRow>[] = useMemo(() => {
    const rows = semesterTableData[activeSemester] || [];
    const totalRowId = `total-${activeSemester}`;

    return [
      {
        key: "column1",
        label: "S.No",
        render: (value, row) => (row.id === totalRowId ? "—" : value),
      },
      {
        key: "column2",
        label: "Test",
        render: (value) => value,
      },
      {
        key: "column4",
        label: "Category",
        render: (_, row) => {
          if (row.id === totalRowId) return <span className="text-center block">—</span>;
          const attemptOptions = row.attemptGroups.map((g) => g.attemptCode);
          return (
            <Select
              value={row.selectedAttempt || ""}
              onValueChange={(val) => handleAttemptChange(row.id, val)}
              disabled={!isEditing || attemptOptions.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select attempt" />
              </SelectTrigger>
              <SelectContent>
                {attemptOptions.map((opt) => (
                  <SelectItem key={`${row.id}-${opt}`} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
      },
      {
        key: "column5",
        label: "Status",
        render: (_, row) => {
          if (row.id === totalRowId) return <span className="text-center block">—</span>;
          const currentAttempt = row.attemptGroups.find((g) => g.attemptCode === row.selectedAttempt);
          const gradeOptions = currentAttempt?.grades ?? [];
          return (
            <Select
              value={row.selectedGrade || ""}
              onValueChange={(val) => handleGradeChange(row.id, val)}
              disabled={!isEditing || gradeOptions.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                {gradeOptions.map((opt) => (
                  <SelectItem key={`${row.id}-${opt.gradeCode}`} value={opt.gradeCode}>
                    {opt.gradeCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
      },
      // ✅ Max Marks read-only and placed between Status and Marks Scored
      {
        key: "column3",
        label: "Max Marks",
        type: "number",
        render: (value, row) => {
          if (row.id === totalRowId) return <span className="text-center block">{pptTableMaxMarks}</span>;
          return <span className="text-center block">{value || "-"}</span>;
        },
      },
      {
        key: "column6",
        label: "Marks Scored",
        type: "number",
        render: (value, row) => {
          if (row.id === totalRowId) return <span className="text-center block">{totalMarksObtained}</span>;
          const disabled = isVirtualId(row.selectedScoreId);
          return isEditing ? (
            <Input
              type="number"
              value={value}
              onChange={(e) => handleMarksChange(row.id, e.target.value)}
              placeholder={disabled ? "No scoreId" : "Enter marks"}
              className="w-full"
              disabled={disabled}
            />
          ) : (
            <span>{value || "-"}</span>
          );
        },
      },
    ];
  }, [semesterTableData, activeSemester, isEditing, pptTableMaxMarks, totalMarksObtained, handleAttemptChange, handleGradeChange, handleMarksChange]);

  const config: TableConfig<PTTableRow> = useMemo(
    () => ({
      columns,
      features: { sorting: false, filtering: false, pagination: false, selection: false, search: false },
      styling: { compact: false, bordered: true, striped: false, hover: true },
    }),
    [columns]
  );

  return (
    <div className="mt-4 space-y-6">
      <Card className="p-6 rounded-2xl shadow-xl bg-white">
        <CardContent className="space-y-6">
          <div className="flex justify-center mb-6 space-x-2">
            {semesters.map((sem) => (
              <button
                key={sem}
                onClick={() => setActiveSemester(sem)}
                disabled={isEditing}
                className={`px-4 py-2 rounded-t-lg font-medium ${
                  activeSemester === sem ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
                } ${isEditing ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {sem}
              </button>
            ))}
          </div>

          <h2 className="text-lg font-bold text-left text-gray-700">
            {pptType?.title ?? "PPT"} {!pptType?.title && ` (${pptTableMaxMarks} marks)`}
          </h2>

          <div className="rounded-lg">
            <UniversalTable<PTTableRow> data={semesterTableData[activeSemester]} config={config} />
          </div>

          <div className="flex gap-3 justify-center mt-6">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save</Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>Edit</Button>
            )}
          </div>

          {["III TERM", "IV TERM", "V TERM", "VI TERM"].includes(activeSemester) && (
            <>
              <IpetForm
                key={`ipet-${activeSemester}`}
                onMarksChange={handleIpetMarks}
                activeSemester={activeSemester}
                scores={apiScores}
                updateScores={updateScores}
                templates={ipetType?.rows ?? []}
                typeTitle={ipetType?.title}
              />
              <Swimming
                key={`swimming-${activeSemester}`}
                onMarksChange={handleSwimmingMarks}
                activeSemester={activeSemester}
                scores={apiScores}
                updateScores={updateScores}
                templates={swimmingType?.rows ?? []}
                typeTitle={swimmingType?.title}
              />
              <HigherTests
                key={`higher-tests-${activeSemester}`}
                onMarksChange={handleHigherTestsMarks}
                activeSemester={activeSemester}
                scores={apiScores}
                updateScores={updateScores}
                templates={higherTestType?.rows ?? []}
                typeTitle={higherTestType?.title}
              />
            </>
          )}

          <MotivationAwards activeSemester={activeSemester} ocId={ocId} fields={motivationFields} />
          <GrandTotal grandTotalMarks={grandTotalMarks} />
        </CardContent>
      </Card>
    </div>
  );
}
