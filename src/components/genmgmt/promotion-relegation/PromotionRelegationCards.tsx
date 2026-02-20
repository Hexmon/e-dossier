"use client";

import { useState } from "react";
import { ArrowDownUp, TrendingUp } from "lucide-react";
import { DashboardCard } from "@/components/cards/DashboardCard";
import RelegationManagementCard from "./RelegationManagementCard";
import PromoteCourseCard from "./PromoteCourseCard";
import { usePromotionRelegationCourses } from "@/hooks/usePromotionRelegationMgmt";

export default function PromotionRelegationCards() {
  const [activeSection, setActiveSection] = useState<"relegation" | "promote" | null>(null);
  const { courses } = usePromotionRelegationCourses();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="Relegation Management"
          description="Transfer OCs and review relegation history"
          icon={ArrowDownUp}
          color="destructive"
          onClick={() => setActiveSection("relegation")}
        />

        <DashboardCard
          title="Promote Course"
          description="Promote entire course with per-OC relegation exceptions"
          icon={TrendingUp}
          color="success"
          onClick={() => setActiveSection("promote")}
        />
      </div>

      {activeSection === "relegation" ? <RelegationManagementCard courses={courses} /> : null}
      {activeSection === "promote" ? <PromoteCourseCard courses={courses} /> : null}
    </div>
  );
}
