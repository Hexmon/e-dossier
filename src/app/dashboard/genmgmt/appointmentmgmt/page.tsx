"use client";

import { useEffect, useState } from "react";
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

interface ServedUser {
  user: string;
  appointment: string;
  fromDate: string;
  toDate: string;
}

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

  useEffect(() => {
    if (handoverDialog) {
      (async () => {
        try {
          const data = await getAllUsers();
          setUsers(data);
        } catch (err) {
          console.error("Failed to fetch users:", err);
          toast.error("Unable to load user list");
          setUsers(fallbackUsers);
        }
      })();
    }
  }, [handoverDialog]);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        // throw new Error("Simulate API failure");
        const data = await getAppointments();
        if (!data || !Array.isArray(data)) {
          throw new Error("Invalid appointments data");
        }

        if (data.length === 0) {
          throw new Error("api data not found");
        }
        if (!Array.isArray(data)) {
          throw new Error("Unexpected API response");
        }
      } catch (err) {
        console.error("Failed to fetch appointments:", err);
        toast.info("Using fallback data due to API failure.");
        setAppointments(fallbackAppointments);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, []);



  // Open Handover Dialog
  const openHandover = (appt: Appointment) => {
    setSelectedAppointment(appt);
    reset();
    setHandoverDialog(true);
  };

  //  Submit Handover
  const onSubmitHandover = async (formData: {
    toUser: string;
    handoverDate: string;
    takeoverDate: string;
  }) => {
    if (!selectedAppointment) return;

    const handover = new Date(formData.handoverDate);
    const takeover = new Date(formData.takeoverDate);

    if (handover >= takeover) {
      toast.error("Handover date must be before takeover date.");
      return;
    }

    try {
      const payload = {
        newUserId: formData.toUser,
        prevEndsAt: handover.toISOString(),
        newStartsAt: takeover.toISOString(),
        reason: "Shift handover",
      };

      await transferAppointment(selectedAppointment.id, payload);

      // Update local state
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
      console.error("Handover failed:", err);
      toast.error(err.message || "Failed to hand over appointment");
    }
  };

  const handleLogout = () => {
    router.push("/login");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
            <PageHeader
              title="Appointment Management"
              description="Manage current and past appointments, handle handovers"
              onLogout={handleLogout}
            />
          </header>

          <main className="flex-1 p-6">
            <BreadcrumbNav
              paths={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Gen Mgmt", href: "/dashboard/genmgmt" },
                { label: "Appointment Management" },
              ]}
            />

            <GlobalTabs tabs={ocTabs} defaultValue="appointment-mgmt">
              <TabsContent value="appointment-mgmt" className="space-y-8">
                {/* --- Current Appointments --- */}
                <section>
                  <h2 className="text-2xl font-bold mb-4">Current Appointments</h2>

                  {loading ? (
                    <p className="text-center text-muted-foreground p-4">
                      Loading appointments...
                    </p>
                  ) : error ? (
                    <p className="text-center text-red-500 p-4">{error}</p>
                  ) : appointments.length === 0 ? (
                    <p className="text-center text-muted-foreground p-4">
                      No appointments found.
                    </p>
                  ) : (
                    <div className="overflow-x-auto border rounded-md">
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
                          {appointments.map((a, i) => (
                            <tr key={i} className="border-t">
                              <td className="px-4 py-2 font-medium">{a.positionName}</td>
                              <td className="px-4 py-2">{a.username}</td>
                              <td className="px-4 py-2">
                                {new Date(a.startsAt).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-2 text-center">
                                <Button variant="outline" onClick={() => openHandover(a)}>
                                  Handing Over
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* --- Served History --- */}
                <section>
                  <h2 className="text-2xl font-bold mb-4">Served History</h2>
                  <div className="overflow-x-auto border rounded-md">
                    <table className="w-full text-sm text-left">
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
                            <td colSpan={3} className="text-center p-4 text-muted-foreground">
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
                  </div>
                </section>
              </TabsContent>
            </GlobalTabs>
          </main>
        </div>
      </div>

      {/* --- Handover Dialog --- */}
      <Dialog open={handoverDialog} onOpenChange={setHandoverDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Handing Over – {selectedAppointment?.positionName || ""}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmitHandover)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">From User</label>
              <Input value={selectedAppointment?.username || ""} disabled />
            </div>

            {/* --- To User Dropdown --- */}
            <div>
              <label className="text-sm font-medium">To User</label>
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
            </div>

            {/* --- Handover Date --- */}
            <div>
              <label className="text-sm font-medium">Handing Over Date</label>
              <Input
                type="date"
                {...register("handoverDate", { required: true })}
                min={new Date().toISOString().split("T")[0]} // can't pick past
              />
            </div>

            {/* --- Takeover Date --- */}
            <div>
              <label className="text-sm font-medium">Taking Over Date</label>
              <Input
                type="date"
                {...register("takeoverDate", { required: true })}
                min={watch("handoverDate") || new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
