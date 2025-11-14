"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Course } from "@/components/courses/CourseCard";

interface CourseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (courseData: Omit<Course, "id">) => void;
  course: Course | null;
  mode: "add" | "edit";
}

export default function CourseFormModal({
  isOpen,
  onClose,
  onSave,
  course,
  mode,
}: CourseFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Omit<Course, "id">>({
    defaultValues: {
      courseNo: "",
      startDate: "",
      endDate: "",
      trgModel: 0,
    },
  });

  useEffect(() => {
    if (course) {
      reset(course);
    } else {
      reset({ courseNo: "", startDate: "", endDate: "", trgModel: 0 });
    }
  }, [course, reset, isOpen]);

  const onSubmit = (data: Omit<Course, "id">) => {
    onSave(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add New Course" : "Edit Course"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground">Course No</label>
            <Input
              {...register("courseNo", { required: "Course number is required" })}
              placeholder="e.g. TES-50"
            />
            {errors.courseNo && (
              <p className="text-xs text-red-500 mt-1">{errors.courseNo.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Start Date</label>
              <Input
                type="date"
                {...register("startDate", { required: "Start date is required" })}
              />
              {errors.startDate && (
                <p className="text-xs text-red-500 mt-1">{errors.startDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground">End Date</label>
              <Input
                type="date"
                // ⬇️ removed "required" so endDate is optional
                {...register("endDate")}
              />
              {errors.endDate && (
                <p className="text-xs text-red-500 mt-1">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground">Training Model</label>
            <Input
              type="number"
              {...register("trgModel", { valueAsNumber: true })}
              placeholder="Enter training model"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{mode === "add" ? "Add Course" : "Save Changes"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
