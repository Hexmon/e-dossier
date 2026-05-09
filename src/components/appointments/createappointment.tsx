"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { AlertTriangle, ArrowRightLeft, PencilLine, UserRound } from "lucide-react";

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
  const [selectedPositionId, setSelectedPositionId] = useState("__custom__");
  const [formData, setFormData] = useState<FormData>({
    userId: "",
    appointmentName: "",
    startsAt: "",
    isPlatoonCommander: false,
    platoonId: "",
    scopeType: "GLOBAL",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const {
    users,
    positions,
    platoons,
    loading,
    fetchUsersAndPositions,
    createNewAppointment,
    createAppointmentConflict,
    clearCreateAppointmentConflict,
  } =
    useAppointments();

  const positionOptions = useMemo(
    () =>
      positions.map((position) => ({
        id: position.id,
        label: position.displayName || position.key,
        scope: position.defaultScope,
      })),
    [positions],
  );

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
    setErrors({});
    clearCreateAppointmentConflict();
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
    setSelectedPositionId("__custom__");
    setErrors({});
    clearCreateAppointmentConflict();
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
                    clearCreateAppointmentConflict();
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
                <Label htmlFor="appointment-position">Appointment Position</Label>
                <Select
                  value={selectedPositionId}
                  onValueChange={(value) => {
                    setSelectedPositionId(value);
                    clearCreateAppointmentConflict();

                    if (value === "__custom__") {
                      setFormData({
                        ...formData,
                        appointmentName: "",
                        isPlatoonCommander: false,
                        platoonId: "",
                        scopeType: "GLOBAL",
                      });
                      return;
                    }

                    const selected = positions.find((position) => position.id === value);
                    if (!selected) {
                      return;
                    }

                    setFormData({
                      ...formData,
                      appointmentName: selected.displayName || selected.key,
                      isPlatoonCommander: selected.defaultScope === "PLATOON",
                      platoonId: selected.defaultScope === "PLATOON" ? formData.platoonId : "",
                      scopeType: selected.defaultScope,
                    });
                    setErrors({ ...errors, appointmentName: "", platoonId: "" });
                  }}
                >
                  <SelectTrigger id="appointment-position">
                    <SelectValue placeholder="Select appointment position" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="__custom__">Custom Position</SelectItem>
                    {positionOptions.map((position) => (
                      <SelectItem key={position.id} value={position.id}>
                        {position.label} ({position.scope})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appointment-name">Display Name</Label>
                <Input
                  id="appointment-name"
                  type="text"
                  placeholder="Enter appointment display name"
                  value={formData.appointmentName}
                  onChange={(e) => {
                    setFormData({ ...formData, appointmentName: e.target.value });
                    setSelectedPositionId("__custom__");
                    setErrors({ ...errors, appointmentName: "" });
                    clearCreateAppointmentConflict();
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Existing appointment roles are reused automatically. If this role already has an active holder, use transfer or edit instead of creating a duplicate.
                </p>
                {errors.appointmentName && (
                  <p className="text-sm text-destructive">{errors.appointmentName}</p>
                )}
              </div>

              {/* Platoon Commander Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="platoon-commander"
                  checked={formData.isPlatoonCommander}
                  disabled={selectedPositionId !== "__custom__"}
                  onCheckedChange={(checked) => {
                    setFormData({
                      ...formData,
                      isPlatoonCommander: checked as boolean,
                      platoonId: "",
                      scopeType: checked ? "PLATOON" : "GLOBAL",
                    });
                    setErrors({ ...errors, platoonId: "" });
                    clearCreateAppointmentConflict();
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
                      clearCreateAppointmentConflict();
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
                    clearCreateAppointmentConflict();
                  }}
                />
                {errors.startsAt && (
                  <p className="text-sm text-destructive">{errors.startsAt}</p>
                )}
              </div>

              {createAppointmentConflict ? (
                <Alert className="border-warning/30 bg-warning/20 text-warning-foreground shadow-sm">
                  <AlertTriangle className="text-warning-foreground" />
                  <AlertTitle>Appointment slot already occupied</AlertTitle>
                  <AlertDescription className="gap-3">
                    <p>
                      <span className="font-medium">{createAppointmentConflict.appointmentName}</span>{" "}
                      already has an overlapping {createAppointmentConflict.scopeType.toLowerCase()} holder.
                    </p>
                    <div className="grid gap-3 rounded-lg border border-warning/25 bg-card p-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-warning-foreground/80">
                          <UserRound className="h-3.5 w-3.5" />
                          Current Holder
                        </div>
                        <div className="font-medium text-foreground">
                          {createAppointmentConflict.currentHolder?.username ?? "Unknown user"}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-medium uppercase tracking-[0.12em] text-warning-foreground/80">
                          Active From
                        </div>
                        <div className="font-medium text-foreground">
                          {createAppointmentConflict.currentHolder?.startsAt
                            ? new Date(createAppointmentConflict.currentHolder.startsAt).toLocaleDateString()
                            : "Unknown"}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-medium uppercase tracking-[0.12em] text-warning-foreground/80">
                          Recommended Action
                        </div>
                        <div className="font-medium text-foreground">
                          Use Handing Over or edit the existing appointment
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-warning-foreground/90">
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/35 px-2.5 py-1">
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        Transfer to replace the holder cleanly
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/35 px-2.5 py-1">
                        <PencilLine className="h-3.5 w-3.5" />
                        Edit if the current row was assigned to the wrong user
                      </span>
                    </div>
                    <p className="text-xs leading-5 text-warning-foreground/80">
                      Scheduled holders appear in Appointment Management immediately, but they only show up in login and switch account once their start date is reached.
                    </p>
                  </AlertDescription>
                </Alert>
              ) : null}

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
