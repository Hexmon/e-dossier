"use client";

import { useState } from "react";
import { Appointment } from "@/app/lib/api/appointmentApi";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AppointmentTableProps {
  appointments: Appointment[];
  onHandover: (appointment: Appointment) => void;
  onEdit: (appointmentId: string, updates: any) => Promise<any>;
  onDelete: (appointmentId: string) => Promise<any>;
  users: any[];
  loading: boolean;
}

export function AppointmentTable({
  appointments,
  onHandover,
  onEdit,
  onDelete,
  users,
  loading,
}: AppointmentTableProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editFormData, setEditFormData] = useState({
    userId: "",
    startsAt: "",
    positionName: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEditClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setEditFormData({
      userId: appointment.userId,
      startsAt: appointment.startsAt.split("T")[0],
      positionName: appointment.positionName || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedAppointment || !editFormData.positionName.trim()) return;
    setIsSubmitting(true);
    try {
      await onEdit(selectedAppointment.id, {
        startsAt: new Date(editFormData.startsAt).toISOString(),
        positionId: selectedAppointment.positionId,
        positionName: editFormData.positionName,
        ...(editFormData.userId !== selectedAppointment.userId && {
          userId: editFormData.userId,
        }),
      });
      setIsEditDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedAppointment) return;
    setIsDeleting(true);
    try {
      await onDelete(selectedAppointment.id);
      setIsDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <p className="text-center text-muted-foreground p-4">
        Loading appointments…
      </p>
    );
  }

  if (appointments.length === 0) {
    return (
      <p className="text-center text-muted-foreground p-4">
        No appointments found.
      </p>
    );
  }

  return (
    <>
      <section className="overflow-x-auto border rounded-md">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-foreground">
            <tr>
              <th className="px-4 py-2">Appointment</th>
              <th className="px-4 py-2">Username</th>
              <th className="px-4 py-2">From</th>
              <th className="px-4 py-2 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {appointments.map((appointment) => (
              <tr key={appointment.id} className="border-t">
                <td className="px-4 py-2 font-medium">
                  {appointment.positionName || "N/A"}
                </td>

                <td className="px-4 py-2">{appointment.username || "Unknown"}</td>

                <td className="px-4 py-2">
                  {new Date(appointment.startsAt).toLocaleDateString()}
                </td>

                <td className="px-4 py-2 text-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onHandover(appointment)}
                  >
                    Handing Over
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditClick(appointment)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteClick(appointment)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              Edit Appointment – {selectedAppointment?.positionName ?? "N/A"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Appointment Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-appointment-name">Appointment Name</Label>
              <Input
                id="edit-appointment-name"
                type="text"
                placeholder="Enter appointment name"
                value={editFormData.positionName}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, positionName: e.target.value })
                }
              />
            </div>

            {/* User Selection */}
            <div className="space-y-2">
              <Label htmlFor="edit-user">Assign to User</Label>
              <Select
                value={editFormData.userId}
                onValueChange={(value) =>
                  setEditFormData({ ...editFormData, userId: value })
                }
              >
                <SelectTrigger id="edit-user">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {users && users.length > 0 ? (
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
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="edit-start-date">Start Date</Label>
              <Input
                id="edit-start-date"
                type="date"
                value={editFormData.startsAt}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, startsAt: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this appointment: <strong>{selectedAppointment?.positionName}</strong>? This action cannot be undone.
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
