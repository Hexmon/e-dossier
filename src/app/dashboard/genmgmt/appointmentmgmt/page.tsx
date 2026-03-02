"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

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
                  <h2 className="text-2xl font-bold">Current Appointments</h2>
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
    </SidebarProvider>
  );
}
