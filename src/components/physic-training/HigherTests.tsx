"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UniversalTable,
  TableColumn,
  TableConfig,
} from "@/components/layout/TableLayout";
import { toast } from "sonner";

import {
  PhysicalTrainingScore,
  UpdatePhysicalTrainingScores,
  PhysicalTrainingTemplateRow,
} from "@/hooks/usePhysicalTraining";
import { buildPTTableRows, PTTableRow } from "./ptTableHelpers";

interface HigherTestsProps {
  onMarksChange: (marks: number) => void;
  activeSemester: string;
  scores: PhysicalTrainingScore[];
  updateScores: UpdatePhysicalTrainingScores;
  templates: PhysicalTrainingTemplateRow[];
  typeTitle?: string;
}

// Semester to API semester mapping (1-based index)
const semesterToApiSemester: Record<string, number> = {
  "I TERM": 1,
  "II TERM": 2,
  "III TERM": 3,
  "IV TERM": 4,
  "V TERM": 5,
  "VI TERM": 6,
};

const isVirtualId = (id?: string) => !!id && id.startsWith("virtual:");

export default function HigherTests({
  onMarksChange,
  activeSemester,
  scores,
  updateScores,
  templates,
  typeTitle,
}: HigherTestsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tableData, setTableData] = useState<PTTableRow[]>([]);

  const scoreById = useMemo(() => {
    const map = new Map<string, PhysicalTrainingScore>();
    scores.forEach((s) => map.set(s.ptTaskScoreId, s));
    return map;
  }, [scores]);

  useEffect(() => {
    const semesterNum = semesterToApiSemester[activeSemester];
    if (!semesterNum) {
      setTableData([]);
      return;
    }
    setTableData(buildPTTableRows(templates, semesterNum, scoreById));
  }, [templates, activeSemester, scoreById]);

  const tableTotal = useMemo(
    () => tableData.reduce((sum, row) => sum + (row.column6 || 0), 0),
    [tableData]
  );

  const totalMaxMarks = useMemo(
    () => tableData.reduce((sum, row) => sum + (row.column3 || 0), 0),
    [tableData]
  );

  useEffect(() => {
    onMarksChange(tableTotal);
  }, [tableTotal, onMarksChange]);

  useEffect(() => {
    onMarksChange(0);
  }, [activeSemester, onMarksChange]);

  const handleAttemptChange = useCallback(
    (rowId: string, attemptCode: string) => {
      setTableData((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row;

          const attemptGroup = row.attemptGroups.find(
            (g) => g.attemptCode === attemptCode
          );
          const nextGrade = attemptGroup?.grades[0];
          const nextScoreId = nextGrade?.scoreId ?? row.selectedScoreId;

          const marks = nextScoreId
            ? scoreById.get(nextScoreId)?.marksScored ?? 0
            : row.column6;

          const maxMarks = nextGrade?.maxMarks ?? row.column3;

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
        })
      );
    },
    [scoreById]
  );

  const handleGradeChange = useCallback(
    (rowId: string, gradeCode: string) => {
      setTableData((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row;

          const attemptGroup = row.attemptGroups.find(
            (g) => g.attemptCode === row.selectedAttempt
          );
          const grade = attemptGroup?.grades.find((g) => g.gradeCode === gradeCode);
          const nextScoreId = grade?.scoreId ?? row.selectedScoreId;

          const marks = nextScoreId
            ? scoreById.get(nextScoreId)?.marksScored ?? 0
            : row.column6;

          const maxMarks = grade?.maxMarks ?? row.column3;

          return {
            ...row,
            selectedGrade: gradeCode,
            column5: gradeCode,
            selectedScoreId: nextScoreId,
            column3: maxMarks,
            column6: marks,
          };
        })
      );
    },
    [scoreById]
  );

  const handleMarksChange = useCallback((rowId: string, value: string) => {
    setTableData((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;

        if (isVirtualId(row.selectedScoreId)) {
          toast.error(
            "This template has no scoreId from server, so marks cannot be saved yet."
          );
          return row;
        }

        if (value.trim() === "") {
          return { ...row, column6: 0 };
        }

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
      })
    );
  }, []);

  const handleSave = useCallback(async () => {
    const semesterNum = semesterToApiSemester[activeSemester];
    if (!semesterNum) return;

    for (const row of tableData) {
      if (
        !isVirtualId(row.selectedScoreId) &&
        row.column6 > 0 &&
        row.column6 > row.column3
      ) {
        toast.error(
          `Invalid marks for ${row.column2}. Marks must be between 0 and ${row.column3}`
        );
        return;
      }
    }

    const scoresForApi = tableData
      .filter((row) => row.selectedScoreId && !isVirtualId(row.selectedScoreId))
      .map((row) => ({
        ptTaskScoreId: row.selectedScoreId,
        marksScored: row.column6 || 0,
        attemptCode: row.selectedAttempt,
        gradeCode: row.selectedGrade,
      }));

    if (scoresForApi.length === 0) {
      toast.error(
        "No valid server scoreIds found to save. Please ensure template provides scoreId."
      );
      return;
    }

    await updateScores(semesterNum, scoresForApi);
    setIsEditing(false);
    toast.success("Higher Tests data saved successfully");
  }, [tableData, activeSemester, updateScores]);

  const totalRow: PTTableRow = {
    id: "total",
    column1: "—",
    column2: "Total",
    column3: totalMaxMarks,
    column4: "",
    column5: "",
    column6: tableTotal,
    attemptGroups: [],
    selectedAttempt: "",
    selectedGrade: "",
    selectedScoreId: "",
  };

  const displayData = [...tableData, totalRow];

  // ✅ Column order: S.No, Test, Category, Status, Max Marks, Marks Scored
  const columns: TableColumn<PTTableRow>[] = useMemo(
    () => [
      {
        key: "column1",
        label: "S.No",
        render: (value, row) => (row.id === "total" ? "—" : value),
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
          if (row.id === "total") return <span className="text-center block">—</span>;
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
                {attemptOptions.map((option) => (
                  <SelectItem key={`${row.id}-${option}`} value={option}>
                    {option}
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
          if (row.id === "total") return <span className="text-center block">—</span>;
          const currentAttempt = row.attemptGroups.find(
            (g) => g.attemptCode === row.selectedAttempt
          );
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
                  <SelectItem
                    key={`${row.id}-${opt.gradeCode}`}
                    value={opt.gradeCode}
                  >
                    {opt.gradeCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
      },
      // ✅ Max Marks read-only (template-driven)
      {
        key: "column3",
        label: "Max Marks",
        type: "number",
        render: (value, row) => {
          if (row.id === "total") {
            return <span className="text-center block">{totalMaxMarks}</span>;
          }
          return <span className="text-center block">{value || "-"}</span>;
        },
      },
      // ✅ Marks Scored editable
      {
        key: "column6",
        label: "Marks Scored",
        type: "number",
        render: (value, row) => {
          if (row.id === "total") {
            return <span className="text-center block">{tableTotal}</span>;
          }
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
    ],
    [
      handleAttemptChange,
      handleGradeChange,
      handleMarksChange,
      isEditing,
      tableTotal,
      totalMaxMarks,
    ]
  );

  const config: TableConfig<PTTableRow> = {
    columns,
    features: {
      sorting: false,
      filtering: false,
      pagination: false,
      selection: false,
      search: false,
    },
    styling: {
      compact: false,
      bordered: true,
      striped: false,
      hover: true,
    },
  };

  return (
    <CardContent className="space-y-4">
      <h2 className="text-lg font-bold text-left text-foreground">
        {typeTitle ?? `Higher Tests (${totalMaxMarks || 30} Marks)`}
      </h2>

      <div className="border border-border rounded-lg">
        <UniversalTable<PTTableRow> data={displayData} config={config} />
      </div>

      <div className="flex gap-3 justify-center mt-4">
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

      <p className="text-sm text-muted-foreground text-center mt-2">
        * Changes are automatically saved
      </p>
    </CardContent>
  );
}
