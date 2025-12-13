"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dashboardCards } from "@/config/app.config";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { DashboardCard } from "@/components/cards/DashboardCard";
import { StatCard } from "@/components/cards/StatCard";
import { stats } from "@/constants/app.constants";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import OCSelectModal from "@/components/modals/OCSelectModal";
import Courses from "@/components/Dashboard/Courses";
import Platoons from "@/components/Dashboard/Platoons";
import Appointments from "@/components/Dashboard/Appointments";

const DashboardPage = () => {
  const router = useRouter();

  // Modal controls
  const [open, setOpen] = useState(false);

  // Search controls
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [filteredOCs, setFilteredOCs] = useState<any[]>([]);

  const handleCardClick = () => {
    setOpen(true);
  };

  return (
    <DashboardLayout title="MCEME CTW Dashboard" description="Training Management System">
      <main className="flex-1 p-6 w-full">
        
        {/* Cartesian Plane Layout - 2x2 Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
          {/* Top Left Quadrant */}
          <div className="w-full">
            <Courses />
          </div>

          {/* Top Right Quadrant */}
          <div className="w-full">
            <Platoons />
          </div>

          {/* Bottom Spanning Both Columns */}
          <div className="w-full lg:col-span-2 mt-2">
            <Appointments />
          </div>
        </div>

        {/* Quick Stats
        <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((item, index) => (
            <StatCard key={index} title={item.title} value={item.value} subtitle={item.subtitle} />
          ))}
        </section> */}
      </main>

      {/* ===================== Modal ===================== */}
      <OCSelectModal
        open={open}
        onOpenChange={setOpen}
        onSelect={(oc) => router.push(`/dashboard/${oc.id}/milmgmt`)}
      />
    </DashboardLayout>
  );
};

export default DashboardPage;
