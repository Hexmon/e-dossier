"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider } from "@/components/ui/sidebar";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import { PageHeader } from "@/components/layout/PageHeader";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

export default function DossierFilling() {
  const router = useRouter();
  const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);

  const handleLogout = () => {
    router.push("/login");
    console.log("Logout clicked");
  };

  const [dossier, setDossier] = useState({
    initiatedBy: "",
    openedOn: "",
    initialInterview: "",
    closedBy: "",
    closedOn: "",
    finalInterview: "",
  });

  const [savedDossier, setSavedDossier] = useState<typeof dossier | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedDossier(dossier);
    alert("Dossier saved successfully!");
  };

  const handleReset = () => {
    setDossier({
      initiatedBy: "",
      openedOn: "",
      initialInterview: "",
      closedBy: "",
      closedOn: "",
      finalInterview: "",
    });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Sidebar */}
        <AppSidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
            <PageHeader
              title="Dossier Filling"
              description="Record, maintain, and fill cadet dossiers for documentation."
              onLogout={handleLogout}
            />
          </header>

          {/* Main Section */}
          <main className="flex-1 p-6">
            <BreadcrumbNav
              paths={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Dossier", href: "/dashboard/milmgmt" },
                { label: "Dossier Filling" },
              ]}
            />

            {/* Selected Cadet Info */}
            <div className="hidden md:flex sticky top-16 z-40">
              {selectedCadet && <SelectedCadetTable selectedCadet={selectedCadet} />}
            </div>

            {/* Dossier Form */}
            <Card className="shadow-lg rounded-xl p-6 border border-border mt-6">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-primary">
                  Dossier Details
                </CardTitle>
              </CardHeader>

              <CardContent>
                <Tabs defaultValue="form">
                  <TabsList className="mb-6">
                    <TabsTrigger
                      value="form"
                      className="border border-gray-300 text-blue-700 data-[state=inactive]:bg-blue-100 data-[state=active]:bg-white data-[state=active]:border-primary rounded-md px-3 py-2 transition-colors"
                    >
                      Fill Form
                    </TabsTrigger>
                    <TabsTrigger
                      value="view"
                      className="border border-gray-300 text-blue-700 data-[state=inactive]:bg-blue-100 data-[state=active]:bg-white data-[state=active]:border-primary rounded-md px-3 py-2 transition-colors"
                    >
                      View Data
                    </TabsTrigger>
                  </TabsList>

                  {/* ---- Form Tab ---- */}
                  <TabsContent value="form">
                    <form onSubmit={handleSave} className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Initiated By</label>
                          <Input
                            value={dossier.initiatedBy}
                            onChange={(e) =>
                              setDossier({ ...dossier, initiatedBy: e.target.value })
                            }
                            placeholder="Enter your name"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Opened On</label>
                          <Input
                            type="date"
                            value={dossier.openedOn}
                            onChange={(e) =>
                              setDossier({ ...dossier, openedOn: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Initial Interview</label>
                        <Textarea
                          value={dossier.initialInterview}
                          onChange={(e) =>
                            setDossier({ ...dossier, initialInterview: e.target.value })
                          }
                          placeholder="Enter initial interview notes..."
                          className="min-h-[100px]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Closed By</label>
                          <Input
                            value={dossier.closedBy}
                            onChange={(e) =>
                              setDossier({ ...dossier, closedBy: e.target.value })
                            }
                            placeholder="Enter your name"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Closed On</label>
                          <Input
                            type="date"
                            value={dossier.closedOn}
                            onChange={(e) =>
                              setDossier({ ...dossier, closedOn: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Final Interview</label>
                        <Textarea
                          value={dossier.finalInterview}
                          onChange={(e) =>
                            setDossier({ ...dossier, finalInterview: e.target.value })
                          }
                          placeholder="Enter final interview notes..."
                          className="min-h-[100px]"
                        />
                      </div>

                      <div className="flex justify-end gap-2 mt-6">
                        <Button variant="outline" type="button" onClick={handleReset}>
                          Reset
                        </Button>
                        <Button type="submit">Save</Button>
                      </div>
                    </form>
                  </TabsContent>

                  {/* ---- View Tab ---- */}
                  <TabsContent value="view">
                    <Card className="p-6 border rounded-lg bg-gray-50">
                      <h3 className="text-lg font-semibold mb-4">Saved Dossier Data</h3>
                      {savedDossier ? (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <p>
                            <strong>Initiated By:</strong> {savedDossier.initiatedBy || "-"}
                          </p>
                          <p>
                            <strong>Opened On:</strong> {savedDossier.openedOn || "-"}
                          </p>
                          <p className="col-span-2">
                            <strong>Initial Interview:</strong>{" "}
                            {savedDossier.initialInterview || "-"}
                          </p>
                          <p>
                            <strong>Closed By:</strong> {savedDossier.closedBy || "-"}
                          </p>
                          <p>
                            <strong>Closed On:</strong> {savedDossier.closedOn || "-"}
                          </p>
                          <p className="col-span-2">
                            <strong>Final Interview:</strong>{" "}
                            {savedDossier.finalInterview || "-"}
                          </p>
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">No dossier data saved yet.</p>
                      )}
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
