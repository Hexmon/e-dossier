"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardCards } from "@/config/app.config";
import { fetchMe, MeResponse } from "../lib/api/me";
import DashboardLayout from "@/components/layout/DashboardLayout";

const DashboardPage = () => {
  return (
    <DashboardLayout title="MCEME CTW Dashboard" description="Training Management System">
      <main className="flex-1 p-6">

        {/* Dashboard Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-11 gap-y-6 mx-auto">
          {dashboardCards.map((card, index) => {
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
                  <Button asChild variant="outline" size="sm" className="w-full border border-blue-700">
                    <Link href={card.to}>Access Module →</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </section>

        {/* Quick Stats */}
        <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active OCs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">246</div>
              <p className="text-xs text-muted-foreground">Across 6 platoons</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ongoing Assessments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">12</div>
              <p className="text-xs text-muted-foreground">This week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Training Completion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">87%</div>
              <p className="text-xs text-muted-foreground">
                Current batch average
              </p>
            </CardContent>
          </Card>
        </section>

      </main>
    </DashboardLayout>
  );
};

export default DashboardPage;
