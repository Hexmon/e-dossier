"use client";

import { dashboardCards } from "@/config/app.config";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { DashboardCard } from "@/components/cards/DashboardCard";
import { StatCard } from "@/components/cards/StatCard";
import { stats } from "@/constants/app.constants";

const DashboardPage = () => {
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
                to={card.to}
                icon={IconComponent}
                color={card.color}
              />
            );
          })}
        </section>

        {/* Quick Stats */}
        <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((item, index) => (
            <StatCard
              key={index}
              title={item.title}
              value={item.value}
              subtitle={item.subtitle}
            />
          ))}
        </section>

      </main>
    </DashboardLayout>
  );
};

export default DashboardPage;