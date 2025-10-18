"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Save } from "lucide-react";

export interface Course {
  id: string;
  name: string;
  code: string;
  instructor: string;
  duration: string;
  status: "pending" | "in-progress" | "completed";
}

interface AddCourseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (course: Omit<Course, "id">) => void;
}

/**
 * AddCourseDialog
 * A modal component for adding new courses in the Course Management module.
 * Fully compatible with Next.js App Router and Shadcn UI components.
 */
export function AddCourseDialog({
  isOpen,
  onOpenChange,
  onAdd,
}: AddCourseDialogProps) {
  const [formData, setFormData] = useState<Omit<Course, "id">>({
    name: "",
    code: "",
    instructor: "",
    duration: "",
    status: "pending",
  });

  const handleChange = (field: keyof Omit<Course, "id">, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.code || !formData.instructor || !formData.duration) {
      return; // Basic validation
    }

    onAdd(formData);

    // Reset form after submit
    setFormData({
      name: "",
      code: "",
      instructor: "",
      duration: "",
      status: "pending",
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Plus className="h-5 w-5 text-primary" />
            Add New Course
          </DialogTitle>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle>Course Information</CardTitle>
            <CardDescription>
              Enter the details for the new course below.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Course Name */}
            <div className="space-y-2">
              <Label htmlFor="course-name">Course Name</Label>
              <Input
                id="course-name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g., Leadership Training"
              />
            </div>

            {/* Course Code */}
            <div className="space-y-2">
              <Label htmlFor="course-code">Course Code</Label>
              <Input
                id="course-code"
                value={formData.code}
                onChange={(e) => handleChange("code", e.target.value)}
                placeholder="e.g., C101"
              />
            </div>

            {/* Instructor */}
            <div className="space-y-2">
              <Label htmlFor="instructor">Instructor</Label>
              <Input
                id="instructor"
                value={formData.instructor}
                onChange={(e) => handleChange("instructor", e.target.value)}
                placeholder="e.g., Capt. Sharma"
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                value={formData.duration}
                onChange={(e) => handleChange("duration", e.target.value)}
                placeholder="e.g., 6 weeks"
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  handleChange("status", value as Course["status"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Add Course
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
