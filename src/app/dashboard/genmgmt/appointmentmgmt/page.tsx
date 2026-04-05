"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { AppointmentTable } from "@/components/appointments/AppointmentTable";
import { ServedHistoryTable } from "@/components/appointments/ServedHistoryTable";
import { HandoverForm } from "@/components/appointments/HandoverForm";
import { useAppointments } from "@/hooks/useAppointments";
import { useForm } from "react-hook-form";
import { ocTabs } from "@/config/app.config";
import { Appointment } from "@/app/lib/api/appointmentApi";
import { CreateAppointment } from "@/components/appointments/createappointment";
import { applyOrgTemplate } from "@/app/lib/api/orgTemplateApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { delegationAdminApi } from "@/app/lib/api/delegationAdminApi";

export default function AppointmentManagement() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    appointments,
    servedList,
    users,
    loading,
    fetchAppointments,
    fetchUsersAndPositions,
    handleHandover,
    handleEditAppointment,
    handleDeleteAppointment,
  } = useAppointments();

  const [handoverDialog, setHandoverDialog] = useState(false);
  const [delegationDialog, setDelegationDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [delegationDraft, setDelegationDraft] = useState({
    grantorAppointmentId: "",
    granteeUserId: "",
    startsAt: "",
    endsAt: "",
    reason: "",
  });

  const delegationsQuery = useQuery({
    queryKey: ["delegations"],
    queryFn: () => delegationAdminApi.list(true),
  });

  const applyDefaultTemplateMutation = useMutation({
    mutationFn: (dryRun: boolean) =>
      applyOrgTemplate({ module: "appointment", profile: "default", dryRun }),
    onSuccess: async (result, dryRun) => {
      await Promise.all([
        fetchAppointments(),
        fetchUsersAndPositions(),
        queryClient.invalidateQueries({ queryKey: ["positions"] }),
      ]);
      const prefix = dryRun ? "Dry run complete." : "Default appointment template applied.";
      toast.success(
        `${prefix} Created: ${result.createdCount}, Updated: ${result.updatedCount}, Skipped: ${result.skippedCount}`
      );
      if (result.warnings.length > 0) {
        toast.warning(`Completed with ${result.warnings.length} warning(s).`);
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to apply default appointment template.");
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      toUser: "",
      handoverDate: "",
      takeoverDate: "",
    },
  });

  const openHandover = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setHandoverDialog(true);
    reset();
  };

  const createDelegationMutation = useMutation({
    mutationFn: async () => {
      return delegationAdminApi.create({
        grantorAppointmentId: delegationDraft.grantorAppointmentId,
        granteeUserId: delegationDraft.granteeUserId,
        startsAt: new Date(`${delegationDraft.startsAt}T00:00:00Z`).toISOString(),
        endsAt: delegationDraft.endsAt
          ? new Date(`${delegationDraft.endsAt}T00:00:00Z`).toISOString()
          : null,
        reason: delegationDraft.reason,
      });
    },
    onSuccess: async () => {
      toast.success("Delegation created successfully.");
      setDelegationDialog(false);
      setDelegationDraft({
        grantorAppointmentId: "",
        granteeUserId: "",
        startsAt: "",
        endsAt: "",
        reason: "",
      });
      await queryClient.invalidateQueries({ queryKey: ["delegations"] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to create delegation.");
    },
  });

  const terminateDelegationMutation = useMutation({
    mutationFn: async (delegationId: string) =>
      delegationAdminApi.terminate(delegationId, "Delegation terminated from appointment management."),
    onSuccess: async () => {
      toast.success("Delegation terminated.");
      await queryClient.invalidateQueries({ queryKey: ["delegations"] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to terminate delegation.");
    },
  });

  const submitHandover = async (data: any) => {
    if (!selectedAppointment) return;
    try {
      await handleHandover(selectedAppointment, data);
      setHandoverDialog(false);
    } catch (error) {
      // Error already handled by mutation
    }
  };

  return (
    <SidebarProvider>
      <section className="flex min-h-screen w-full bg-background">
        <AppSidebar />

        <main className="flex-1 flex flex-col">
          <PageHeader
            title="Appointment Management"
            description="Manage current and past appointments, handle handovers"
          />

          <section className="p-6">
            <BreadcrumbNav
              paths={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Admin Mgmt", href: "/dashboard/genmgmt" },
                { label: "Appointment Management" },
              ]}
            />

            <GlobalTabs tabs={ocTabs} defaultValue="appointment-mgmt">
              <TabsContent value="appointment-mgmt" className="space-y-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Transfer / Delegate</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => applyDefaultTemplateMutation.mutate(true)}
                      disabled={applyDefaultTemplateMutation.isPending}
                    >
                      {applyDefaultTemplateMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Running
                        </>
                      ) : (
                        "Preview Changes (Dry Run)"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => applyDefaultTemplateMutation.mutate(false)}
                      disabled={applyDefaultTemplateMutation.isPending}
                    >
                      {applyDefaultTemplateMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Applying
                        </>
                      ) : (
                        "Apply Default Appointment Template"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setDelegationDialog(true)}
                    >
                      Create Delegation
                    </Button>
                    <CreateAppointment />
                  </div>
                </div>
                <AppointmentTable
                  appointments={appointments}
                  loading={loading}
                  onHandover={openHandover}
                  onEdit={handleEditAppointment}
                  onDelete={handleDeleteAppointment}
                  users={users}
                />

                <Card>
                  <CardHeader>
                    <CardTitle>Active Delegations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {delegationsQuery.isLoading ? (
                      <p className="text-sm text-muted-foreground">Loading delegations...</p>
                    ) : (delegationsQuery.data?.items ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No active delegations found.</p>
                    ) : (
                      <div className="space-y-3">
                        {(delegationsQuery.data?.items ?? []).map((delegation) => (
                          <div
                            key={delegation.id}
                            className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                          >
                            <div className="space-y-1">
                              <div className="font-medium">
                                {delegation.positionName ?? delegation.positionKey ?? "Delegation"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {delegation.grantorUsername} → {delegation.granteeUsername}
                                {delegation.platoonName ? ` • ${delegation.platoonName}` : ""}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(delegation.startsAt).toLocaleDateString()} to{" "}
                                {delegation.endsAt ? new Date(delegation.endsAt).toLocaleDateString() : "Open-ended"}
                              </div>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => terminateDelegationMutation.mutate(delegation.id)}
                              disabled={terminateDelegationMutation.isPending}
                            >
                              Terminate
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <ServedHistoryTable servedList={servedList} />
              </TabsContent>
            </GlobalTabs>
          </section>
        </main>
      </section>

      <Dialog open={handoverDialog} onOpenChange={setHandoverDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Handing Over – {selectedAppointment?.positionName ?? "N/A"}
            </DialogTitle>
          </DialogHeader>

          <HandoverForm
            appointment={selectedAppointment}
            users={users}
            register={register}
            handleSubmit={handleSubmit}
            watch={watch}
            onSubmit={submitHandover}
            submitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={delegationDialog} onOpenChange={setDelegationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Delegation</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delegation-grantor">Grantor Appointment</Label>
              <select
                id="delegation-grantor"
                value={delegationDraft.grantorAppointmentId}
                onChange={(event) =>
                  setDelegationDraft((current) => ({
                    ...current,
                    grantorAppointmentId: event.target.value,
                  }))
                }
                className="w-full rounded-md border bg-background p-2 text-sm"
              >
                <option value="">Select appointment</option>
                {appointments.map((appointment) => (
                  <option key={appointment.id} value={appointment.id}>
                    {appointment.positionName} • {appointment.username}
                    {appointment.platoonName ? ` • ${appointment.platoonName}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delegation-grantee">Delegate To</Label>
              <select
                id="delegation-grantee"
                value={delegationDraft.granteeUserId}
                onChange={(event) =>
                  setDelegationDraft((current) => ({
                    ...current,
                    granteeUserId: event.target.value,
                  }))
                }
                className="w-full rounded-md border bg-background p-2 text-sm"
              >
                <option value="">Select user</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.username})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="delegation-starts-at">Start Date</Label>
                <Input
                  id="delegation-starts-at"
                  type="date"
                  value={delegationDraft.startsAt}
                  onChange={(event) =>
                    setDelegationDraft((current) => ({
                      ...current,
                      startsAt: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delegation-ends-at">End Date</Label>
                <Input
                  id="delegation-ends-at"
                  type="date"
                  value={delegationDraft.endsAt}
                  onChange={(event) =>
                    setDelegationDraft((current) => ({
                      ...current,
                      endsAt: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delegation-reason">Reason</Label>
              <Textarea
                id="delegation-reason"
                value={delegationDraft.reason}
                onChange={(event) =>
                  setDelegationDraft((current) => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
                placeholder="Reason for temporary acting delegation"
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => createDelegationMutation.mutate()}
                disabled={createDelegationMutation.isPending}
              >
                {createDelegationMutation.isPending ? "Creating..." : "Create Delegation"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
