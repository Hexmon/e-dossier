"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { fallbackAppointments, fallbackUsers, ocTabs } from "@/config/app.config";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Appointment, getAppointments, transferAppointment } from "@/app/lib/api/appointmentApi";
import { getAllUsers, User } from "@/app/lib/api/userApi";
import { ServedUser } from "@/types/appointmentmgmt";

export default function AppointmentManagement() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [servedList, setServedList] = useState<ServedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [handoverDialog, setHandoverDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<{
    toUser: string;
    handoverDate: string;
    takeoverDate: string;
  }>({
    defaultValues: {
      toUser: "",
      handoverDate: "",
      takeoverDate: "",
    },
  });

  // Memoized static config
  const memoizedTabs = useMemo(() => ocTabs, []);
  const memoizedFallbackUsers = useMemo(() => fallbackUsers, []);

  useEffect(() => {
    if (handoverDialog) {
      (async () => {
        try {
          const data = await getAllUsers();
          setUsers(data);
        } catch (err) {
          toast.error("Unable to load user list");
          setUsers(memoizedFallbackUsers);
        }
      })();
    }
  }, [handoverDialog, memoizedFallbackUsers]);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAppointments();

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("No appointment data found");
      }

      setAppointments(data);
    } catch (err) {
      toast.info("Using fallback data due to API failure.");
      setAppointments(fallbackAppointments);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const openHandover = useCallback((appt: Appointment) => {
    setSelectedAppointment(appt);
    reset();
    setHandoverDialog(true);
  }, [reset]);

  const onSubmitHandover = async (formData: {
    toUser: string;
    handoverDate: string;
    takeoverDate: string;
  }) => {
    if (!selectedAppointment) return;

    const handover = new Date(`${formData.handoverDate}T00:00:00Z`);
    const takeover = new Date(`${formData.takeoverDate}T00:00:00Z`);
    const appointmentStart = new Date(selectedAppointment.startsAt);

    if (handover <= appointmentStart) return;
    if (handover >= takeover) {
      toast.error("Handover date must be before takeover date.");
      return;
    }

    try {
      const payload = {
        newUserId: formData.toUser,
        prevEndsAt: handover.toISOString(),
        newStartsAt: takeover.toISOString(),
        positionId: selectedAppointment.positionId,
        scopeType: selectedAppointment.scopeType,
        scopeId: selectedAppointment.scopeType === "GLOBAL" ? null : selectedAppointment.scopeId,
        reason: "Shift handover",
      };

      await transferAppointment(selectedAppointment.id, payload);

      const newServed: ServedUser = {
        user: selectedAppointment.username,
        appointment: selectedAppointment.positionName,
        fromDate: selectedAppointment.startsAt,
        toDate: formData.handoverDate,
      };

      setServedList((prev) => [...prev, newServed]);
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === selectedAppointment.id
            ? { ...a, username: users.find(u => u.id === formData.toUser)?.username || "", startsAt: formData.takeoverDate }
            : a
        )
      );

      toast.success(`Appointment handed over successfully`);
      setHandoverDialog(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to hand over appointment");
    }
  };

  const handleLogout = () => router.push("/login");

  return (
    <SidebarProvider>
      <section className="min-h-screen flex w-full bg-background">
        <aside>
          <AppSidebar />
        </aside>

        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
            <PageHeader
              title="Appointment Management"
              description="Manage current and past appointments, handle handovers"
              onLogout={handleLogout}
            />
          </header>

          <section className="flex-1 p-6">
            <nav aria-label="Breadcrumb">
              <BreadcrumbNav
                paths={[
                  { label: "Dashboard", href: "/dashboard" },
                  { label: "Gen Mgmt", href: "/dashboard/genmgmt" },
                  { label: "Appointment Management" },
                ]}
              />
            </nav>

            <GlobalTabs tabs={memoizedTabs} defaultValue="appointment-mgmt">
              <TabsContent value="appointment-mgmt" className="space-y-8">
                {/* --- Current Appointments --- */}
                <section aria-labelledby="current-appointments">
                  <h2 id="current-appointments" className="text-2xl font-bold mb-4">
                    Current Appointments
                  </h2>

                  {loading ? (
                    <p className="text-center text-muted-foreground p-4" aria-live="polite">
                      Loading appointments...
                    </p>
                  ) : error ? (
                    <p className="text-center text-red-500 p-4" role="alert">
                      {error}
                    </p>
                  ) : appointments.length === 0 ? (
                    <p className="text-center text-muted-foreground p-4">No appointments found.</p>
                  ) : (
                    <article className="overflow-x-auto border rounded-md">
                      <table className="w-full text-sm text-left">
                        <caption className="sr-only">Current Appointments List</caption>
                        <thead className="bg-muted text-foreground">
                          <tr>
                            <th className="px-4 py-2">Appointment</th>
                            <th className="px-4 py-2">Username</th>
                            <th className="px-4 py-2">From</th>
                            <th className="px-4 py-2 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {appointments.map((a) => (
                            <tr key={a.id} className="border-t">
                              <td className="px-4 py-2 font-medium">{a.positionName}</td>
                              <td className="px-4 py-2">{a.username}</td>
                              <td className="px-4 py-2">
                                {new Date(a.startsAt).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-2 text-center">
                                <Button
                                  variant="outline"
                                  onClick={() => openHandover(a)}
                                  aria-label={`Hand over ${a.positionName}`}
                                >
                                  Handing Over
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </article>
                  )}
                </section>

                {/* --- Served History --- */}
                <section aria-labelledby="served-history">
                  <h2 id="served-history" className="text-2xl font-bold mb-4">
                    Served History
                  </h2>
                  <article className="overflow-x-auto border rounded-md">
                    <table className="w-full text-sm text-left">
                      <caption className="sr-only">Served Appointment History</caption>
                      <thead className="bg-muted text-foreground">
                        <tr>
                          <th className="px-4 py-2">User & Appointment</th>
                          <th className="px-4 py-2">From</th>
                          <th className="px-4 py-2">To</th>
                        </tr>
                      </thead>
                      <tbody>
                        {servedList.length === 0 ? (
                          <tr>
                            <td
                              colSpan={3}
                              className="text-center p-4 text-muted-foreground"
                            >
                              No served history available.
                            </td>
                          </tr>
                        ) : (
                          servedList.map((s, i) => (
                            <tr key={i} className="border-t">
                              <td className="px-4 py-2 font-medium">
                                {s.user} ({s.appointment})
                              </td>
                              <td className="px-4 py-2">{s.fromDate}</td>
                              <td className="px-4 py-2">{s.toDate}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </article>
                </section>
              </TabsContent>
            </GlobalTabs>
          </section>
        </main>
      </section>

      {/* --- Handover Dialog --- */}
      <Dialog open={handoverDialog} onOpenChange={setHandoverDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Handing Over – {selectedAppointment?.positionName || ""}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmitHandover)} className="space-y-4">
            <fieldset>
              <legend className="sr-only">Handover Details</legend>

              <label className="text-sm font-medium">From User</label>
              <Input value={selectedAppointment?.username || ""} disabled />

              <label className="text-sm font-medium mt-4">To User</label>
              <select
                {...register("toUser", { required: true })}
                className="w-full border rounded-md p-2 text-sm bg-background"
              >
                <option value="">Select user</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.username})
                  </option>
                ))}
              </select>

              <label className="text-sm font-medium mt-4">Handing Over Date</label>
              <Input
                type="date"
                {...register("handoverDate", { required: true })}
                min={new Date().toISOString().split("T")[0]}
              />

              <label className="text-sm font-medium mt-4">Taking Over Date</label>
              <Input
                type="date"
                {...register("takeoverDate", { required: true })}
                min={watch("handoverDate") || new Date().toISOString().split("T")[0]}
              />
            </fieldset>

            <footer className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </footer>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
