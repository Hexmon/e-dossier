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
      <main className="flex-1 p-6">

        {/* Dashboard Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-11 gap-y-6 mx-auto">
          {dashboardCards.map((card, index) => {
            const IconComponent = card.icon;

            return (
              <DashboardCard
                key={index}
                title={card.title}
                description={card.description}
                icon={IconComponent}
                color={card.color}
                onClick={card.title === "Dossier" ? handleCardClick : undefined}
                to={card.title === "Dossier" ? undefined : card.to}
              />
            );
          })}
        </section>

        {/* Quick Stats */}
        <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((item, index) => (
            <StatCard key={index} title={item.title} value={item.value} subtitle={item.subtitle} />
          ))}
        </section>
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
