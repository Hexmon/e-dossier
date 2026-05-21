"use client";

import React from "react";
import { ArrowDownUp, History, TrendingUp } from "lucide-react";
import { DashboardCard } from "@/components/cards/DashboardCard";

export default function PromotionRelegationCards() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <DashboardCard
        title="Relegation Management"
        description="Transfer OCs between courses or repeat semesters"
        icon={ArrowDownUp}
        color="destructive"
        to="/dashboard/genmgmt/promotion-relegation/relegation"
      />

      <DashboardCard
        title="Relegation History"
        description="Search, filter, and audit promotion and relegation records"
        icon={History}
        color="primary"
        to="/dashboard/genmgmt/promotion-relegation/history"
      />

      <DashboardCard
        title="Promote Course"
        description="Promote cadets semester-wise within a selected course"
        icon={TrendingUp}
        color="success"
        to="/dashboard/genmgmt/promotion-relegation/promote-course"
      />
    </div>
  );
}
