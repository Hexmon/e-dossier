"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { setSelectedCadet } from "@/store/cadetSlice";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import { militaryTrainingCards, miltrgTabs } from "@/config/app.config";
import { Cadet } from "@/types/cadet";
import { TabsContent } from "@/components/ui/tabs";

// Debounce + APIs
import { useDebouncedValue } from "@/app/lib/debounce";
import { fetchOCs, OCListRow } from "@/app/lib/api/ocApi";
import { fetchCourseById } from "@/app/lib/api/courseApi";
import { toast } from "sonner";

export default function MilitaryTrainingPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const selectedCadet = useSelector(
    (state: RootState) => state.cadet.selectedCadet
  );
console.log("Selected Cadet in MilTrg Page:", selectedCadet);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [filteredOCs, setFilteredOCs] = useState<OCListRow[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // debounced search
  const debouncedSearch = useDebouncedValue(searchQuery, 400);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsSearching(true);
      try {
        const trimmed = debouncedSearch.trim();

        const items = await fetchOCs<OCListRow>({
          active: true,
          q: trimmed || undefined,
          limit: 50,
        });

        if (!cancelled) setFilteredOCs(items);
      } catch (err) {
        if (!cancelled) console.error("Failed to fetch OCs:", err);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  const handleSearchChange = (e: any) => {
    setSearchQuery(e.target.value);
    setShowDropdown(true);
  };

  const handleSelectOC = async (oc: OCListRow) => {
    try {
      const res = await fetchCourseById(oc.courseId);
      const courseCode = res?.course?.code || "";

      const cadetData: Cadet = {
        name: oc.name,
        course: oc.courseId,
        courseName: courseCode,
        ocNumber: oc.ocNo,
        ocId: oc.id,
      };

      dispatch(setSelectedCadet(cadetData));
      setSearchQuery(`${oc.name} (${oc.ocNo})`);
      setShowDropdown(false);
    } catch {
      toast.error("Error loading cadet");
    }
  };

  return (
    <DashboardLayout
      title="Dossier"
      description="Organize, manage, and securely store essential documents"
    >
      <div className="flex justify-between items-center rounded-2xl mb-2">
        <BreadcrumbNav
          paths={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Dossier" },
          ]}
        />

        {/* Search */}
        <div className="relative w-80">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search or select OC..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              className="pl-10 w-full"
            />
          </div>

          {showDropdown && (
            <ul className="absolute z-50 mt-1 w-full bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
              {isSearching && (
                <li className="px-3 py-2 text-xs text-muted-foreground">Searching...</li>
              )}

              {!isSearching && filteredOCs.length === 0 && (
                <li className="px-3 py-2 text-xs text-muted-foreground">No OCs found</li>
              )}

              {!isSearching &&
                filteredOCs.map((oc) => (
                  <li
                    key={oc.id}
                    onMouseDown={() => handleSelectOC(oc)}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
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
      {selectedCadet && (
        <div className="hidden md:flex sticky top-16 z-40 mb-6">
          <SelectedCadetTable selectedCadet={selectedCadet} />
        </div>
      )}

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
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${card.color} text-white`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-lg group-hover:text-primary">
                        {card.title}
                      </CardTitle>
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

        <TabsContent value="settings">
          <div className="text-center py-12">
            <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">General Settings</h3>
            <p className="text-muted-foreground">Manage system roles, permissions, and more.</p>
          </div>
        </TabsContent>
      </GlobalTabs>

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
    </DashboardLayout>
  );
}