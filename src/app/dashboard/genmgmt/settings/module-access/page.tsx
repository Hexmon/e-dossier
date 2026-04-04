"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { moduleAccessAdminApi } from "@/app/lib/api/moduleAccessAdminApi";
import { useMe } from "@/hooks/useMe";

type ModuleAccessDraft = {
  adminCanAccessDossier: boolean;
  adminCanAccessBulkUpload: boolean;
  adminCanAccessReports: boolean;
};

const MODULE_TOGGLES: Array<{
  key: keyof ModuleAccessDraft;
  title: string;
  description: string;
}> = [
  {
    key: "adminCanAccessDossier",
    title: "Dossier Management",
    description: "Controls the dossier sidebar section, the /dashboard/[id]/milmgmt pages, and dossier-specific OC APIs for ADMIN users.",
  },
  {
    key: "adminCanAccessBulkUpload",
    title: "Bulk Upload",
    description: "Controls the bulk-upload hub and baseline access to bulk Academics/PT pages and APIs for ADMIN users.",
  },
  {
    key: "adminCanAccessReports",
    title: "Reports",
    description: "Controls the reports sidebar section, /dashboard/reports, and /api/v1/reports/* for ADMIN users.",
  },
];

function emptyDraft(): ModuleAccessDraft {
  return {
    adminCanAccessDossier: false,
    adminCanAccessBulkUpload: false,
    adminCanAccessReports: false,
  };
}

export default function ModuleAccessSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: meData, isLoading: meLoading } = useMe();
  const [draft, setDraft] = useState<ModuleAccessDraft>(emptyDraft());
  const [saving, setSaving] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ["module-access-settings"],
    queryFn: () => moduleAccessAdminApi.getSettings(),
  });

  const isSuperAdmin = useMemo(
    () =>
      (meData?.roles ?? []).some((role) => String(role).trim().toUpperCase() === "SUPER_ADMIN"),
    [meData?.roles]
  );

  useEffect(() => {
    if (!meLoading && !isSuperAdmin) {
      router.replace("/dashboard");
    }
  }, [isSuperAdmin, meLoading, router]);

  useEffect(() => {
    if (!settingsQuery.data?.settings) return;
    setDraft({
      adminCanAccessDossier: settingsQuery.data.settings.adminCanAccessDossier,
      adminCanAccessBulkUpload: settingsQuery.data.settings.adminCanAccessBulkUpload,
      adminCanAccessReports: settingsQuery.data.settings.adminCanAccessReports,
    });
  }, [settingsQuery.data]);

  const handleToggle = (key: keyof ModuleAccessDraft, checked: boolean) => {
    setDraft((current) => ({
      ...current,
      [key]: checked,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await moduleAccessAdminApi.updateSettings(draft);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["module-access-settings"] }),
        queryClient.invalidateQueries({ queryKey: ["navigation", "me"] }),
        queryClient.invalidateQueries({ queryKey: ["me"] }),
      ]);
      toast.success("Module access settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save module access settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      title="Module Access Settings"
      description="Control which configured modules remain visible and accessible for ADMIN users."
    >
      <main className="space-y-6 p-6">
        <BreadcrumbNav
          paths={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "General Management", href: "/dashboard/genmgmt?tab=settings" },
            { label: "Module Access Settings" },
          ]}
        />

        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-primary">Module Access Settings</h2>
            <p className="text-muted-foreground">
              These toggles are the backend source of truth for ADMIN access. SUPER_ADMIN always keeps full access.
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving || settingsQuery.isLoading}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        {settingsQuery.error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {(settingsQuery.error as Error).message}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          {MODULE_TOGGLES.map((toggle) => (
            <Card key={toggle.key}>
              <CardHeader>
                <CardTitle>{toggle.title}</CardTitle>
                <CardDescription>{toggle.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4">
                <Label htmlFor={toggle.key} className="text-sm font-medium">
                  Allow ADMIN access
                </Label>
                <Switch
                  id={toggle.key}
                  checked={draft[toggle.key]}
                  onCheckedChange={(checked) => handleToggle(toggle.key, checked)}
                  disabled={settingsQuery.isLoading || saving}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </DashboardLayout>
  );
}
