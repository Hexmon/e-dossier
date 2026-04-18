"use client";

import { useState } from "react";
import { CalendarDays, Loader2, Plus } from "lucide-react";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePlatoonCadetAppointments } from "@/hooks/usePlatoonCadetAppointments";

import type {
  PlatoonCadetAppointment,
  PlatoonScopedCadet,
} from "@/app/lib/api/platoonCadetAppointmentsApi";

type AppointmentFormState = {
  cadetId: string;
  appointmentName: string;
  startsAt: string;
  reason: string;
};

type TransferFormState = {
  newCadetId: string;
  handoverDate: string;
  takeoverDate: string;
  reason: string;
};

const EMPTY_FORM: AppointmentFormState = {
  cadetId: "",
  appointmentName: "",
  startsAt: "",
  reason: "",
};

const EMPTY_TRANSFER_FORM: TransferFormState = {
  newCadetId: "",
  handoverDate: "",
  takeoverDate: "",
  reason: "",
};

function toInputDate(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function isAppointmentFormValid(form: AppointmentFormState): boolean {
  return Boolean(form.cadetId && form.appointmentName.trim() && form.startsAt);
}

function isTransferFormValid(form: TransferFormState): boolean {
  return Boolean(
    form.newCadetId &&
      form.handoverDate &&
      form.takeoverDate &&
      form.handoverDate < form.takeoverDate
  );
}

function CadetSelect({
  cadets,
  value,
  onChange,
  excludeCadetId,
}: {
  cadets: PlatoonScopedCadet[];
  value: string;
  onChange: (value: string) => void;
  excludeCadetId?: string;
}) {
  return (
    <select
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Select cadet</option>
      {cadets
        .filter((cadet) => cadet.id !== excludeCadetId)
        .map((cadet) => (
          <option key={cadet.id} value={cadet.id}>
            {cadet.name} ({cadet.ocNo})
          </option>
        ))}
    </select>
  );
}

export default function CadetAppointmentsSettingsPageClient() {
  const {
    dashboardQuery,
    createMutation,
    updateMutation,
    deleteMutation,
    transferMutation,
  } = usePlatoonCadetAppointments();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<PlatoonCadetAppointment | null>(null);
  const [createForm, setCreateForm] = useState<AppointmentFormState>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<AppointmentFormState>(EMPTY_FORM);
  const [transferForm, setTransferForm] = useState<TransferFormState>(EMPTY_TRANSFER_FORM);

  const platoon = dashboardQuery.data?.platoon;
  const cadets = dashboardQuery.data?.cadets ?? [];
  const activeAppointments = dashboardQuery.data?.activeAppointments ?? [];
  const historyAppointments = dashboardQuery.data?.historyAppointments ?? [];

  const openEditDialog = (appointment: PlatoonCadetAppointment) => {
    setSelectedAppointment(appointment);
    setEditForm({
      cadetId: appointment.cadetId,
      appointmentName: appointment.appointmentName,
      startsAt: toInputDate(appointment.startsAt),
      reason: appointment.reason ?? "",
    });
    setEditOpen(true);
  };

  const openTransferDialog = (appointment: PlatoonCadetAppointment) => {
    setSelectedAppointment(appointment);
    setTransferForm({
      newCadetId: "",
      handoverDate: "",
      takeoverDate: "",
      reason: appointment.reason ?? "",
    });
    setTransferOpen(true);
  };

  const openDeleteDialog = (appointment: PlatoonCadetAppointment) => {
    setSelectedAppointment(appointment);
    setDeleteOpen(true);
  };

  const handleCreate = async () => {
    if (!isAppointmentFormValid(createForm)) return;
    await createMutation.mutateAsync({
      cadetId: createForm.cadetId,
      appointmentName: createForm.appointmentName,
      startsAt: new Date(createForm.startsAt).toISOString(),
      reason: createForm.reason || undefined,
    });
    setCreateOpen(false);
    setCreateForm(EMPTY_FORM);
  };

  const handleEdit = async () => {
    if (!selectedAppointment) return;
    if (!isAppointmentFormValid(editForm)) return;
    await updateMutation.mutateAsync({
      appointmentId: selectedAppointment.id,
      payload: {
        cadetId: editForm.cadetId,
        appointmentName: editForm.appointmentName,
        startsAt: new Date(editForm.startsAt).toISOString(),
        reason: editForm.reason || null,
      },
    });
    setEditOpen(false);
    setSelectedAppointment(null);
  };

  const handleTransfer = async () => {
    if (!selectedAppointment) return;
    if (!isTransferFormValid(transferForm)) return;
    await transferMutation.mutateAsync({
      appointmentId: selectedAppointment.id,
      payload: {
        newCadetId: transferForm.newCadetId,
        prevEndsAt: new Date(transferForm.handoverDate).toISOString(),
        newStartsAt: new Date(transferForm.takeoverDate).toISOString(),
        reason: transferForm.reason || undefined,
      },
    });
    setTransferOpen(false);
    setSelectedAppointment(null);
  };

  const handleDelete = async () => {
    if (!selectedAppointment) return;
    await deleteMutation.mutateAsync(selectedAppointment.id);
    setDeleteOpen(false);
    setSelectedAppointment(null);
  };

  if (dashboardQuery.isLoading) {
    return (
      <DashboardLayout
        title="Cadet Appointments"
        description="Manage platoon-level cadet appointments for your assigned platoon"
      >
        <section className="space-y-6 p-6">
          <Card>
            <CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading cadet appointments...
            </CardContent>
          </Card>
        </section>
      </DashboardLayout>
    );
  }

  if (dashboardQuery.isError) {
    return (
      <DashboardLayout
        title="Cadet Appointments"
        description="Manage platoon-level cadet appointments for your assigned platoon"
      >
        <section className="space-y-6 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Unable to Load Appointments</CardTitle>
              <CardDescription>
                {dashboardQuery.error instanceof Error
                  ? dashboardQuery.error.message
                  : "Failed to load cadet appointments."}
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Cadet Appointments"
      description="Manage platoon-level cadet appointments for your assigned platoon"
    >
      <section className="space-y-6 p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                {platoon ? `${platoon.name} Cadet Appointments` : "Cadet Appointments"}
              </CardTitle>
              <CardDescription>
                Only cadets from your platoon are available here. Admin appointments are not shown.
              </CardDescription>
            </div>
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Appointment
            </Button>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Appointments</CardTitle>
            <CardDescription>
              Active cadet appointments for {platoon?.name ?? "your platoon"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2">Appointment</th>
                    <th className="px-4 py-2">Cadet</th>
                    <th className="px-4 py-2">OC No</th>
                    <th className="px-4 py-2">From</th>
                    <th className="px-4 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                        No active cadet appointments found.
                      </td>
                    </tr>
                  ) : (
                    activeAppointments.map((appointment) => (
                      <tr key={appointment.id} className="border-t">
                        <td className="px-4 py-3 font-medium">{appointment.appointmentName}</td>
                        <td className="px-4 py-3">{appointment.cadetName}</td>
                        <td className="px-4 py-3">{appointment.cadetOcNo}</td>
                        <td className="px-4 py-3">{formatDate(appointment.startsAt)}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-wrap justify-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openTransferDialog(appointment)}
                            >
                              Hand Over
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(appointment)}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => openDeleteDialog(appointment)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appointment History</CardTitle>
            <CardDescription>
              Completed cadet appointments from {platoon?.name ?? "your platoon"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2">Cadet & Appointment</th>
                    <th className="px-4 py-2">From</th>
                    <th className="px-4 py-2">To</th>
                  </tr>
                </thead>
                <tbody>
                  {historyAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                        No cadet appointment history found.
                      </td>
                    </tr>
                  ) : (
                    historyAppointments.map((appointment) => (
                      <tr key={appointment.id} className="border-t">
                        <td className="px-4 py-3 font-medium">
                          {appointment.cadetName} ({appointment.appointmentName})
                        </td>
                        <td className="px-4 py-3">{formatDate(appointment.startsAt)}</td>
                        <td className="px-4 py-3">{formatDate(appointment.endsAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Cadet Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cadet</Label>
              <CadetSelect
                cadets={cadets}
                value={createForm.cadetId}
                onChange={(value) => setCreateForm((prev) => ({ ...prev, cadetId: value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-appointment-name">Appointment Name</Label>
              <Input
                id="create-appointment-name"
                value={createForm.appointmentName}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    appointmentName: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-start-date">Start Date</Label>
              <Input
                id="create-start-date"
                type="date"
                value={createForm.startsAt}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, startsAt: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-reason">Reason</Label>
              <Input
                id="create-reason"
                value={createForm.reason}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, reason: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={createMutation.isPending || !isAppointmentFormValid(createForm)}
            >
              {createMutation.isPending ? "Creating..." : "Create Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Cadet Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cadet</Label>
              <CadetSelect
                cadets={cadets}
                value={editForm.cadetId}
                onChange={(value) => setEditForm((prev) => ({ ...prev, cadetId: value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-appointment-name">Appointment Name</Label>
              <Input
                id="edit-appointment-name"
                value={editForm.appointmentName}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    appointmentName: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-start-date">Start Date</Label>
              <Input
                id="edit-start-date"
                type="date"
                value={editForm.startsAt}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, startsAt: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-reason">Reason</Label>
              <Input
                id="edit-reason"
                value={editForm.reason}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, reason: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleEdit}
              disabled={updateMutation.isPending || !isAppointmentFormValid(editForm)}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hand Over Cadet Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Cadet</Label>
              <Input value={selectedAppointment?.cadetName ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>To Cadet</Label>
              <CadetSelect
                cadets={cadets}
                value={transferForm.newCadetId}
                onChange={(value) =>
                  setTransferForm((prev) => ({ ...prev, newCadetId: value }))
                }
                excludeCadetId={selectedAppointment?.cadetId}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="handover-date">Handover Date</Label>
              <Input
                id="handover-date"
                type="date"
                value={transferForm.handoverDate}
                onChange={(event) =>
                  setTransferForm((prev) => ({
                    ...prev,
                    handoverDate: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="takeover-date">Takeover Date</Label>
              <Input
                id="takeover-date"
                type="date"
                value={transferForm.takeoverDate}
                onChange={(event) =>
                  setTransferForm((prev) => ({
                    ...prev,
                    takeoverDate: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer-reason">Reason</Label>
              <Input
                id="transfer-reason"
                value={transferForm.reason}
                onChange={(event) =>
                  setTransferForm((prev) => ({ ...prev, reason: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTransferOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleTransfer}
              disabled={transferMutation.isPending || !isTransferFormValid(transferForm)}
            >
              {transferMutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Cadet Appointment</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete {selectedAppointment?.appointmentName} for {selectedAppointment?.cadetName}?
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
