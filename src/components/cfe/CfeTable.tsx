"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  UniversalTable,
  TableColumn,
  TableAction,
  TableConfig,
} from "@/components/layout/TableLayout";
import { catOptions } from "@/constants/app.constants";
import type { cfeRow } from "@/types/cfe";

interface Props {
  rows: cfeRow[];
  loading: boolean;
  StartEdit?: (index: number) => void;
  onReplaceSemester?: (
    semesterIndex: number,
    items: { cat: string; marks: number; remarks?: string; sub_category?: string }[]
  ) => Promise<void> | void;
  onDelete: (index: number, semesterIndex: number, rows: cfeRow[]) => Promise<void> | void;
  semesterIndex: number;
}

export default function CfeTable({
  rows,
  loading,
  StartEdit,
  onReplaceSemester,
  onDelete,
  semesterIndex,
}: Props) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{
    cat: string;
    mks: string;
    remarks: string;
    sub_category: string;
  }>({ cat: "", mks: "", remarks: "", sub_category: "" });

  const startEdit = (index: number) => {
    const row = rows[index];
    setEditingIndex(index);
    setEditValues({
      cat: row.cat ?? "",
      mks: row.mks ?? "",
      remarks: row.remarks ?? "",
      sub_category: row.sub_category ?? "",
    });
    StartEdit?.(index);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditValues({ cat: "", mks: "", remarks: "", sub_category: "" });
  };

  const saveEdit = async (index: number) => {
    // Build new items array by replacing the single index, preserving sub_category for all rows
    const items = rows.map((r, i) => {
      if (i !== index) {
        return {
          cat: r.cat ?? "",
          marks: Number(r.mks) || 0,
          remarks: r.remarks ?? "",
          sub_category: r.sub_category ?? "",
        };
      }
      return {
        cat: editValues.cat,
        marks: Number(editValues.mks) || 0,
        remarks: editValues.remarks ?? "",
        sub_category: editValues.sub_category ?? "",
      };
    });

    if (onReplaceSemester) {
      await onReplaceSemester(semesterIndex, items);
    }

    cancelEdit();
  };

  const handleDelete = async (index: number) => {
    await onDelete(index, semesterIndex, rows);
  };

  const columns: TableColumn<cfeRow>[] = [
    {
      key: "serialNo",
      label: "S No",
      render: (value, row, index) => value || String(index + 1),
    },
    {
      key: "cat",
      label: "Cat",
      render: (value, row, index) => {
        const isEditing = editingIndex === index;
        return isEditing ? (
          <Select
            value={editValues.cat}
            onValueChange={(v) => setEditValues((p) => ({ ...p, cat: v }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {catOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          value || "-"
        );
      },
    },
    {
      key: "sub_category",
      label: "Sub Category",
      render: (value, row, index) => {
        const isEditing = editingIndex === index;
        return isEditing ? (
          <Input
            value={editValues.sub_category}
            onChange={(e) =>
              setEditValues((p) => ({ ...p, sub_category: e.target.value }))
            }
          />
        ) : (
          value || "-"
        );
      },
    },
    {
      key: "mks",
      label: "Mks",
      render: (value, row, index) => {
        const isEditing = editingIndex === index;
        return isEditing ? (
          <Input
            value={editValues.mks}
            onChange={(e) => setEditValues((p) => ({ ...p, mks: e.target.value }))}
          />
        ) : (
          value || "0"
        );
      },
    },
    {
      key: "remarks",
      label: "Remarks",
      render: (value, row, index) => {
        const isEditing = editingIndex === index;
        return isEditing ? (
          <Input
            value={editValues.remarks}
            onChange={(e) =>
              setEditValues((p) => ({ ...p, remarks: e.target.value }))
            }
          />
        ) : (
          value || "-"
        );
      },
    },
  ];

  const actions: TableAction<cfeRow>[] = [
    {
      key: "edit-cancel",
      label: editingIndex !== null ? "Cancel" : "Edit",
      variant: "outline",
      size: "sm",
      handler: (row, index) => {
        if (editingIndex === index) {
          cancelEdit();
        } else {
          startEdit(index);
        }
      },
      condition: () => !loading,
    },
    {
      key: "save-delete",
      label: editingIndex !== null ? "Save" : "Delete",
      variant: editingIndex !== null ? "default" : "destructive",
      size: "sm",
      className: editingIndex !== null ? "bg-green-600" : "",
      handler: async (row, index) => {
        if (editingIndex === index) {
          await saveEdit(index);
        } else {
          await handleDelete(index);
        }
      },
      condition: (row, index) => {
        if (editingIndex === index) return !loading;
        return !loading && !!row.id;
      },
    },
  ];

  const config: TableConfig<cfeRow> = {
    columns,
    actions,
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
      hover: false,
    },
    emptyState: {
      message: "No records for this semester.",
    },
    loading,
  };

  return (
    <div className="mb-6">
      <UniversalTable<cfeRow> data={rows} config={config} />
    </div>
  );
}
