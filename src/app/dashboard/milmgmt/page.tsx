"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { setSelectedCadet } from "@/store/cadetSlice";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Search, Settings } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import { militaryTrainingCards, miltrgTabs } from "@/config/app.config";
import { Cadet } from "@/types/cadet";
import { TabsContent } from "@/components/ui/tabs";
import { getAllOCs, OCRecord } from "@/app/lib/api/ocApi";

export default function MilitaryTrainingPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [ocList, setOcList] = useState<OCRecord[]>([]);
  const [filteredOCs, setFilteredOCs] = useState<OCRecord[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchOCs = async () => {
    try {
      const ocs = await getAllOCs();
      setOcList(ocs);
      setFilteredOCs(ocs);
    } catch (err) {
      console.error("Failed to fetch OCs:", err);
    }
  };
  useEffect(() => {
    fetchOCs();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (!value) {
      setFilteredOCs(ocList);
      return;
    }

    const filtered = ocList.filter(
      (oc) =>
        oc.name.toLowerCase().includes(value.toLowerCase()) ||
        oc.ocNo.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredOCs(filtered);
    setShowDropdown(true);
  };

  const handleSelectOC = (oc: OCRecord) => {
    const cadetData: Cadet = {
      name: oc.name,
      course: oc.courseId,
      ocNumber: oc.ocNo,
      ocId: oc.id,
    };

    dispatch(setSelectedCadet(cadetData));
    setSearchQuery(`${oc.name} (${oc.ocNo})`);
    setShowDropdown(false);
  };


  const handleLogout = () => {
    router.push("/login");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
            <PageHeader
              title="Dossier"
              description="Organize, manage, and securely store essential documents and files"
              onLogout={handleLogout}
            />
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
            {/* Top Bar */}
            <div className="flex justify-between items-center rounded-2xl mb-2">
              <BreadcrumbNav
                paths={[
                  { label: "Dashboard", href: "/dashboard" },
                  { label: "Dossier" },
                ]}
              />

              {/* Search Section */}
              <div className="relative w-80">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search or select OC..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                    className="pl-10 w-full"
                  />
                </div>

                {showDropdown && filteredOCs.length > 0 && (
                  <ul className="absolute z-50 mt-1 w-full bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredOCs.map((oc) => (
                      <li
                        key={oc.id}
                        onMouseDown={() => handleSelectOC(oc)}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <div className="font-medium">{oc.name}</div>
                        <div className="text-xs text-muted-foreground">{oc.ocNo}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Selected Cadet */}
            <div className="hidden md:flex sticky top-16 z-40">
              {selectedCadet && <SelectedCadetTable selectedCadet={selectedCadet} />}
            </div>

            {/* Tabs */}
            <GlobalTabs tabs={miltrgTabs} defaultValue="mil-trg">
              <TabsContent value="mil-trg" className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-11 gap-y-6 mx-auto">
                  {militaryTrainingCards.map((card, index) => {
                    const IconComponent = card.icon;
                    return (
                      <Card
                        key={index}
                        className="group hover:shadow-command transition-all duration-300 cursor-pointer rounded-xl shadow-lg"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${card.color} text-white`}>
                              <IconComponent className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                                {card.title}
                              </CardTitle>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                            {card.description}
                          </p>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={(e) => {
                              if (!selectedCadet) {
                                e.preventDefault();
                                setShowAlert(true);
                              }
                            }}
                          >
                            <Link href={card.to}>Access Module →</Link>
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <div className="text-center py-12">
                  <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    General Settings
                  </h3>
                  <p className="text-muted-foreground">
                    Manage system roles, permissions, and more.
                  </p>
                </div>
              </TabsContent>
            </GlobalTabs>
          </main>
        </div>
      </div>

      {/* Alert Dialog */}
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertMessage || "Alert"}</AlertDialogTitle>
            <AlertDialogDescription>
              {alertMessage ||
                "You must search and select a cadet before filling out training details."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowAlert(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
