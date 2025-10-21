"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText, BarChart3, Save } from "lucide-react";

export interface CourseAssessment {
  assignments: number;
  midterm: number;
  project: number;
  final: number;
  total: number;
  grade: string;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  instructor: string;
  duration: string;
  status: "pending" | "in-progress" | "completed";
  theory?: CourseAssessment;
  practical?: CourseAssessment;
}

interface CourseEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  course: Partial<Course>;
  onSave?: (id: string, updatedCourse: Course) => void;
}

const initialAssessment: CourseAssessment = {
  assignments: 0,
  midterm: 0,
  project: 0,
  final: 0,
  total: 0,
  grade: "",
};

export default function CourseEditDialog({
  isOpen,
  onOpenChange,
  course,
  onSave,
}: CourseEditDialogProps) {
  const [theoryDetails, setTheoryDetails] = useState<CourseAssessment>(
    course.theory || initialAssessment
  );
  const [practicalDetails, setPracticalDetails] = useState<CourseAssessment>(
    course.practical || initialAssessment
  );

  const handleTheoryChange = (
    field: keyof CourseAssessment,
    value: string | number
  ) => {
    setTheoryDetails((prev) => ({
      ...prev,
      [field]:
        typeof value === "string" && field === "grade" ? value : Number(value),
    }));
  };

  const handlePracticalChange = (
    field: keyof CourseAssessment,
    value: string | number
  ) => {
    setPracticalDetails((prev) => ({
      ...prev,
      [field]:
        typeof value === "string" && field === "grade" ? value : Number(value),
    }));
  };

  const calculateTotal = (details: CourseAssessment) => {
    const { assignments, midterm, project, final } = details;
    return assignments + midterm + project + final;
  };

  const handleSave = () => {
    const updatedTheory = {
      ...theoryDetails,
      total: calculateTotal(theoryDetails),
    };
    const updatedPractical = {
      ...practicalDetails,
      total: calculateTotal(practicalDetails),
    };

    const updatedCourse: Course = {
      ...(course as Course),
      theory: updatedTheory,
      practical: updatedPractical,
    };

    if (onSave && course.id) {
      onSave(course.id, updatedCourse);
    }
    onOpenChange(false);
  };

  const AssessmentForm = ({
    details,
    onChange,
    type,
  }: {
    details: CourseAssessment;
    onChange: (field: keyof CourseAssessment, value: string | number) => void;
    type: "theory" | "practical";
  }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${type}-assignments`}>Assignments</Label>
          <Input
            id={`${type}-assignments`}
            type="number"
            value={details.assignments}
            onChange={(e) => onChange("assignments", e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${type}-midterm`}>Midterm</Label>
          <Input
            id={`${type}-midterm`}
            type="number"
            value={details.midterm}
            onChange={(e) => onChange("midterm", e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${type}-project`}>Project</Label>
          <Input
            id={`${type}-project`}
            type="number"
            value={details.project}
            onChange={(e) => onChange("project", e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${type}-final`}>Final Exam</Label>
          <Input
            id={`${type}-final`}
            type="number"
            value={details.final}
            onChange={(e) => onChange("final", e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${type}-grade`}>Letter Grade</Label>
          <Input
            id={`${type}-grade`}
            value={details.grade}
            onChange={(e) => onChange("grade", e.target.value)}
            placeholder="A+"
          />
        </div>
        <div className="space-y-2 flex flex-col justify-end">
          <Label className="text-base font-semibold">Total</Label>
          <div className="text-2xl font-bold text-primary">
            {calculateTotal(details)}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Edit Course: {course.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="theory" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="theory" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Theory Assessment
            </TabsTrigger>
            <TabsTrigger value="practical" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Practical Assessment
            </TabsTrigger>
          </TabsList>

          <TabsContent value="theory">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Theory Assessment Details
                </CardTitle>
                <CardDescription>
                  Enter the marks and details for theory assessment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AssessmentForm
                  details={theoryDetails}
                  onChange={handleTheoryChange}
                  type="theory"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="practical">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Practical Assessment Details
                </CardTitle>
                <CardDescription>
                  Enter the marks and details for practical assessment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AssessmentForm
                  details={practicalDetails}
                  onChange={handlePracticalChange}
                  type="practical"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
