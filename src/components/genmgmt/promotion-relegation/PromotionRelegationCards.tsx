"use client";

import { ArrowDownUp, TrendingUp } from "lucide-react";
import { DashboardCard } from "@/components/cards/DashboardCard";

export default function PromotionRelegationCards() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <DashboardCard
        title="Relegation Management"
        description="Transfer OCs and review relegation history"
        icon={ArrowDownUp}
        color="destructive"
        to="/dashboard/genmgmt/promotion-relegation/relegation"
      />

      <DashboardCard
        title="Promote Course"
        description="Promote entire course with per-OC relegation exceptions"
        icon={TrendingUp}
        color="success"
        to="/dashboard/genmgmt/promotion-relegation/promote-course"
      />
    </div>
  );
}
