"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppointments } from "@/hooks/useAppointments";

interface FormData {
  userId: string;
  appointmentName: string;
  startsAt: string;
  isPlatoonCommander: boolean;
  platoonId: string;
  scopeType: "GLOBAL" | "PLATOON";
}

export const CreateAppointment = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    userId: "",
    appointmentName: "",
    startsAt: "",
    isPlatoonCommander: false,
    platoonId: "",
    scopeType: "GLOBAL",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { users, platoons, loading, fetchUsersAndPositions, createNewAppointment } =
    useAppointments();

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
    setErrors({});
    fetchUsersAndPositions();
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setFormData({
      userId: "",
      appointmentName: "",
      startsAt: "",
      isPlatoonCommander: false,
      platoonId: "",
      scopeType: "GLOBAL",
    });
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.userId) {
      newErrors.userId = "Please select a user";
    }
    if (!formData.appointmentName) {
      newErrors.appointmentName = "Appointment name is required";
    }
    if (!formData.startsAt) {
      newErrors.startsAt = "Start date is required";
    }
    if (formData.isPlatoonCommander && !formData.platoonId) {
      newErrors.platoonId = "Please select a platoon";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await createNewAppointment(formData);
      if (success) {
        handleCloseDialog();
        window.location.reload();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Button
        onClick={handleOpenDialog}
        className="bg-primary hover:bg-primary"
      >
        <Plus className="h-4 w-4 mr-2" />
        Create Appointment
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Appointment</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading users...
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-6">
              {/* User Selection */}
              <div className="space-y-2">
                <Label htmlFor="user-select">User</Label>
                <Select
                  value={formData.userId}
                  onValueChange={(value) => {
                    setFormData({ ...formData, userId: value });
                    setErrors({ ...errors, userId: "" });
                  }}
                >
                  <SelectTrigger id="user-select">
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    {users.length > 0 ? (
                      users.map((user) => (
                        <SelectItem key={user.id} value={user.id || ""}>
                          {user.username || user.email || "Unknown User"}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground">
                        No users available
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {errors.userId && (
                  <p className="text-sm text-destructive">{errors.userId}</p>
                )}
              </div>

              {/* Appointment Name */}
              <div className="space-y-2">
                <Label htmlFor="appointment-name">Appointment Name</Label>
                <Input
                  id="appointment-name"
                  type="text"
                  placeholder="Enter appointment name "
                  value={formData.appointmentName}
                  onChange={(e) => {
                    setFormData({ ...formData, appointmentName: e.target.value });
                    setErrors({ ...errors, appointmentName: "" });
                  }}
                />
                {errors.appointmentName && (
                  <p className="text-sm text-destructive">{errors.appointmentName}</p>
                )}
              </div>

              {/* Platoon Commander Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="platoon-commander"
                  checked={formData.isPlatoonCommander}
                  onCheckedChange={(checked) => {
                    setFormData({
                      ...formData,
                      isPlatoonCommander: checked as boolean,
                      platoonId: "",
                      scopeType: checked ? "PLATOON" : "GLOBAL",
                    });
                    setErrors({ ...errors, platoonId: "" });
                  }}
                />
                <Label htmlFor="platoon-commander" className="cursor-pointer">
                  This appointment is for a Platoon Commander
                </Label>
              </div>

              {/* Platoon Selection */}
              {formData.isPlatoonCommander && (
                <div className="space-y-2">
                  <Label htmlFor="platoon-select">Select Platoon</Label>
                  <Select
                    value={formData.platoonId}
                    onValueChange={(value) => {
                      setFormData({ ...formData, platoonId: value });
                      setErrors({ ...errors, platoonId: "" });
                    }}
                  >
                    <SelectTrigger id="platoon-select">
                      <SelectValue placeholder="Select a platoon" />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      {platoons.length > 0 ? (
                        platoons.map((platoon) => (
                          <SelectItem key={platoon.id} value={platoon.id}>
                            {platoon.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground">
                          No platoons available
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  {errors.platoonId && (
                    <p className="text-sm text-destructive">{errors.platoonId}</p>
                  )}
                </div>
              )}

              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={formData.startsAt}
                  onChange={(e) => {
                    setFormData({ ...formData, startsAt: e.target.value });
                    setErrors({ ...errors, startsAt: "" });
                  }}
                />
                {errors.startsAt && (
                  <p className="text-sm text-destructive">{errors.startsAt}</p>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Appointment"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
