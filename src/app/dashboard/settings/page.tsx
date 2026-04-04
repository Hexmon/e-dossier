"use client";

import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Settings, Shield, Timer } from "lucide-react";
import { useMe } from "@/hooks/useMe";
import { canManageCadetAppointments } from "@/lib/platoon-commander-access";

export default function SettingsLandingPage() {
  const { data: meData } = useMe();
  const canViewCadetAppointments = canManageCadetAppointments({
    roles: meData?.roles ?? [],
    position: meData?.apt?.position ?? null,
    scopeType: meData?.apt?.scope?.type ?? null,
  });

  return (
    <DashboardLayout title="Settings" description="Device and access-control configuration">
      <section className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Device Site Settings
              </CardTitle>
              <CardDescription>
                Configure theme mode, accent palette, density, language, timezone, and refresh interval.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Changes apply instantly on this device and can be synced to backend settings.
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/dashboard/settings/device">Open Device Site Settings</Link>
              </Button>
            </CardFooter>
          </Card>

          {canViewCadetAppointments && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Cadet Appointments
                </CardTitle>
                <CardDescription>
                  Create, transfer, and manage cadet appointments inside your assigned platoon.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This settings area is available only for platoon commander logins.
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href="/dashboard/settings/device/appointments">Open Cadet Appointments</Link>
                </Button>
              </CardFooter>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Permission Management
              </CardTitle>
              <CardDescription>
                Manage role-based access control from Admin Management settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Available only to ADMIN and SUPER_ADMIN.
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/dashboard/genmgmt/rbac">Open Permission Management</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Ticker Setting
              </CardTitle>
              <CardDescription>
                Configure start and end dates used to calculate interview pending days in dashboard marquee text.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Marquee text format: INTERVIEW PENDING BY {"<days>"} DAYS.
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/dashboard/settings/ticker">Open Ticker Setting</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>
    </DashboardLayout>
  );
}
