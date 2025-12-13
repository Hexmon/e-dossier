"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Marquee from "@/components/Dashboard/Marquee";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import OCSelectModal from "@/components/modals/OCSelectModal";
import Courses from "@/components/Dashboard/Courses";
import Platoons from "@/components/Dashboard/Platoons";
import Appointments from "@/components/Dashboard/Appointments";
import { marqueeData } from "@/components/Dashboard/MarqueeData";

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

      <main className="flex-1 p-6 w-full mt-10 overflow-x-hidden">

        {/* Marquee Section - Only visible in content area with proper clipping */}
        <div className="w-full overflow-hidden z-40 shrink-0">
          <Marquee
            data={marqueeData}
            speed={15}
            className="w-full"
          />
        </div>

        {/* Cartesian Plane Layout - 2x2 Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full max-w-full">
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