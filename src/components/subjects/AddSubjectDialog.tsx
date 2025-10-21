"use client";

import { useState, useEffect } from "react";
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

interface Subject {
  id?: string;
  trgModel?: string;
  semNo?: string;
  code?: string;
  name?: string;
  subjectType?: string;
  theoryPractical?: string;
  credits?: number;
}

interface AddSubjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (subject: Omit<Subject, "id">) => void;
  subject?: Omit<Subject, "id">;
}

export default function AddSubjectDialog({
  isOpen,
  onOpenChange,
  onAdd,
  subject,
}: AddSubjectDialogProps) {
  const [formData, setFormData] = useState<Omit<Subject, "id">>({
    trgModel: "",
    semNo: "",
    code: "",
    name: "",
    subjectType: "Common",
    theoryPractical: "Theory",
    credits: 0,
  });

  useEffect(() => {
    if (subject) {
      setFormData(subject); // Pre-fill form if editing
    } else {
      setFormData({
        trgModel: "",
        semNo: "",
        code: "",
        name: "",
        subjectType: "Common",
        theoryPractical: "Theory",
        credits: 0,
      });
    }
  }, [subject, isOpen]);

  const handleChange = (field: keyof Subject, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.code || !formData.semNo) {
      return; // Basic validation
    }

    onAdd(formData);

    if (!subject) {
      setFormData({
        trgModel: "",
        semNo: "",
        code: "",
        name: "",
        subjectType: "Common",
        theoryPractical: "Theory",
        credits: 0,
      });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {subject ? "Edit Subject" : "Add New Subject"}
          </DialogTitle>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle>Subject Information</CardTitle>
            <CardDescription>
              {subject
                ? "Update details for this subject."
                : "Enter details for the new semester subject."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Training Model */}
            <div className="space-y-2">
              <Label htmlFor="trgModel">Training Model</Label>
              <Input
                id="trgModel"
                value={formData.trgModel}
                onChange={(e) => handleChange("trgModel", e.target.value)}
                placeholder="Enter training model"
              />
            </div>

            {/* Semester Number */}
            <div className="space-y-2">
              <Label htmlFor="semNo">Semester No.</Label>
              <Input
                id="semNo"
                value={formData.semNo}
                onChange={(e) => handleChange("semNo", e.target.value)}
                placeholder="I"
              />
            </div>

            {/* Subject Code */}
            <div className="space-y-2">
              <Label htmlFor="code">Subject Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => handleChange("code", e.target.value)}
                placeholder="e.g., CH101"
              />
            </div>

            {/* Subject Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Subject Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="ENGINEERING CHEMISTRY"
              />
            </div>

            {/* Subject Type */}
            <div className="space-y-2">
              <Label htmlFor="subjectType">Subject Type</Label>
              <Select
                value={formData.subjectType}
                onValueChange={(value) => handleChange("subjectType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Common">Common</SelectItem>
                  <SelectItem value="Electronics">Electronics</SelectItem>
                  <SelectItem value="Mechanical">Mechanical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Theory/Practical */}
            <div className="space-y-2">
              <Label htmlFor="theoryPractical">Theory/Practical</Label>
              <Select
                value={formData.theoryPractical}
                onValueChange={(value) => handleChange("theoryPractical", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Theory">Theory</SelectItem>
                  <SelectItem value="Practical">Practical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Credits */}
            <div className="space-y-2">
              <Label htmlFor="credits">Credits</Label>
              <Input
                id="credits"
                type="number"
                value={formData.credits}
                onChange={(e) =>
                  handleChange("credits", parseInt(e.target.value) || 0)
                }
                placeholder="3"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {subject ? "Save Changes" : "Add Subject"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
