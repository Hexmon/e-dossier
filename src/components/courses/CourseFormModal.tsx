"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Course } from "./CourseCard";

interface CourseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (course: Omit<Course, "id">) => void;
  course?: Course | null;
  mode: "add" | "edit";
}

export default function CourseFormModal({
  isOpen,
  onClose,
  onSave,
  course,
  mode,
}: CourseFormModalProps) {
  const [formData, setFormData] = useState<Omit<Course, "id">>({
    courseNo: "",
    startDate: "",
    endDate: "",
    trgModel: 0,
  });

  useEffect(() => {
    if (course && mode === "edit") {
      setFormData({
        courseNo: course.courseNo,
        startDate: course.startDate,
        endDate: course.endDate,
        trgModel: course.trgModel,
      });
    } else {
      setFormData({
        courseNo: "",
        startDate: "",
        endDate: "",
        trgModel: 0,
      });
    }
  }, [course, mode, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleClose = () => {
    onClose();
    setFormData({
      courseNo: "",
      startDate: "",
      endDate: "",
      trgModel: 0,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add New Course" : "Edit Course"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="courseNo">Course Number</Label>
            <Input
              id="courseNo"
              value={formData.courseNo}
              onChange={(e) =>
                setFormData({ ...formData, courseNo: e.target.value })
              }
              placeholder="e.g., TES-43"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trgModel">Training Model</Label>
            <Input
              id="trgModel"
              type="number"
              value={formData.trgModel}
              onChange={(e) =>
                setFormData({ ...formData, trgModel: Number(e.target.value) })
              }
              placeholder="Enter training model"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">
              {mode === "add" ? "Add Course" : "Update Course"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
