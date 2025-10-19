"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { ocTabs } from "@/config/app.config";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { baseURL, endpoints } from "@/constants/endpoints";
import { api } from "@/app/lib/apiClient";

type Appointment = {
  name: string;
  user: string;
  fromDate: string;
};

type ServedUser = {
  user: string;
  appointment: string;
  fromDate: string;
  toDate: string;
};

export default function AppointmentManagement() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [servedList, setServedList] = useState<ServedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [handoverDialog, setHandoverDialog] = useState(false);
  const [handoverData, setHandoverData] = useState({
    fromUser: "",
    toUser: "",
    appointment: "",
    handoverDate: "",
    takeoverDate: "",
  });

  const handleLogout = () => {
    router.push("/login");
  };

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const data = await api.get<{ items: Appointment[] }>(endpoints.admin.appointments, {
          baseURL,
        });
        setAppointments(data.items || []);
      } catch (err: any) {
        console.error("Failed to fetch appointments:", err);
        setError(err.message || "Failed to load appointments.");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  const openHandover = (appt: Appointment) => {
    setHandoverData({
      ...handoverData,
      fromUser: appt.user,
      appointment: appt.name,
    });
    setHandoverDialog(true);
  };

  const handleSubmitHandover = () => {
    if (!handoverData.toUser || !handoverData.handoverDate || !handoverData.takeoverDate) {
      toast.error("Please fill all fields before submitting.");
      return;
    }

    const appt = appointments.find((a) => a.name === handoverData.appointment);
    if (appt) {
      const newServed: ServedUser = {
        user: appt.user,
        appointment: appt.name,
        fromDate: appt.fromDate,
        toDate: handoverData.handoverDate,
      };
      setServedList([...servedList, newServed]);
    }

    const updatedAppointments = appointments.map((a) =>
      a.name === handoverData.appointment
        ? { ...a, user: handoverData.toUser, fromDate: handoverData.takeoverDate }
        : a
    );
    setAppointments(updatedAppointments);
    toast.success(`Appointment handed over to ${handoverData.toUser}`);
    setHandoverDialog(false);
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
                {/* --- Section 1: Current Appointments --- */}
                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Current Appointments</h2>

                  {loading ? (
                    <p className="text-center p-4 text-muted-foreground">Loading appointments...</p>
                  ) : error ? (
                    <p className="text-center p-4 text-red-500">{error}</p>
                  ) : appointments.length === 0 ? (
                    <p className="text-center p-4 text-muted-foreground">No appointments found.</p>
                  ) : (
                    <div className="overflow-x-auto border rounded-md">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted text-foreground">
                          <tr>
                            <th className="px-4 py-2">Appointment</th>
                            <th className="px-4 py-2">User</th>
                            <th className="px-4 py-2">From Date</th>
                            <th className="px-4 py-2 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {appointments.map((a, index) => (
                            <tr key={index} className="border-t">
                              <td className="px-4 py-2 font-medium">{a.name}</td>
                              <td className="px-4 py-2">{a.user}</td>
                              <td className="px-4 py-2">{a.fromDate}</td>
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

                {/* --- Section 2: Served History --- */}
                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Served History</h2>
                  <div className="overflow-x-auto border rounded-md">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted text-foreground">
                        <tr>
                          <th className="px-4 py-2">User & Appointment</th>
                          <th className="px-4 py-2">From Date</th>
                          <th className="px-4 py-2">To Date</th>
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
                          servedList.map((s, index) => (
                            <tr key={index} className="border-t">
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
            <DialogTitle>Handing Over - {handoverData.appointment}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">From User</label>
              <Input value={handoverData.fromUser} disabled />
            </div>
            <div>
              <label className="text-sm font-medium">To User</label>
              <Input
                placeholder="Enter new user's name"
                value={handoverData.toUser}
                onChange={(e) =>
                  setHandoverData({ ...handoverData, toUser: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Handing Over Date</label>
              <Input
                type="date"
                value={handoverData.handoverDate}
                onChange={(e) =>
                  setHandoverData({ ...handoverData, handoverDate: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Taking Over Date</label>
              <Input
                type="date"
                value={handoverData.takeoverDate}
                onChange={(e) =>
                  setHandoverData({ ...handoverData, takeoverDate: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSubmitHandover}>Submit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
