"use client";

import { useEffect } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UICourse } from "@/hooks/useCourses";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<UICourse, "id">) => void;
  course: UICourse | null;
  mode: "add" | "edit";
}

export default function CourseFormModal({
  isOpen,
  onClose,
  onSave,
  course,
  mode,
}: Props) {

  const { register, handleSubmit, reset } = useForm<Omit<UICourse, "id">>({
    defaultValues: {
      courseNo: "",
      startDate: "",
      endDate: "",
      trgModel: 0,
    },
  });

  useEffect(() => {
    reset({
      courseNo: course?.courseNo ?? "",
      startDate: course?.startDate ?? "",
      endDate: course?.endDate ?? "",
      trgModel: course?.trgModel ?? 0,
    });
  }, [course, reset]);

  const submit: SubmitHandler<Omit<UICourse, "id">> = (data) => {
    onSave(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add Course" : "Edit Course"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <div>
            <label>Course No</label>
            <Input {...register("courseNo", { required: true })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label>Start Date</label>
              <Input type="date" {...register("startDate")} />
            </div>
            <div>
              <label>End Date</label>
              <Input type="date" {...register("endDate")} />
            </div>
          </div>

          <div>
            <label>Training Model</label>
            <Input type="number" {...register("trgModel")} />
          </div>

          <div className="flex justify-end gap-2">
            <Button className="bg-muted text-foreground hover:bg-destructive hover:text-primary-foreground" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-success">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
