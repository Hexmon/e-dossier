"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  dossierLockAdminApi,
  type DossierLockSettingsResponse,
} from "@/app/lib/api/dossierLockAdminApi";

const LOCK_POLICY_OPTIONS = [
  {
    value: "DEFAULT" as const,
    title: "Follow Current Semester",
    description: "Use the active OC semester to lock historical and future semesters as the system does by default.",
  },
  {
    value: "FREEZE_ALL" as const,
    title: "Freeze All Forms",
    description: "Make all dossier forms read-only for every semester and every editable module.",
  },
  {
    value: "UNFREEZE_ALL" as const,
    title: "Unfreeze All Forms",
    description: "Allow all editable dossier forms to be updated across all semesters, regardless of current semester.",
  },
];

type DossierLockSettingsPageClientProps = {
  initialSettings: DossierLockSettingsResponse["settings"];
};

export default function DossierLockSettingsPageClient({
  initialSettings,
}: DossierLockSettingsPageClientProps) {
  const queryClient = useQueryClient();
  const [lockPolicy, setLockPolicy] = useState(initialSettings.lockPolicy);
  const [saving, setSaving] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ["dossier-lock-settings"],
    queryFn: () => dossierLockAdminApi.getSettings(),
    initialData: {
      settings: initialSettings,
    },
    refetchOnMount: false,
  });

  useEffect(() => {
    if (!settingsQuery.data?.settings) return;
    setLockPolicy(settingsQuery.data.settings.lockPolicy);
  }, [settingsQuery.data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await dossierLockAdminApi.updateSettings({ lockPolicy });
      queryClient.setQueryData(["dossier-lock-settings"], result);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dossier-lock-settings"] }),
        queryClient.invalidateQueries({ queryKey: ["me"] }),
      ]);
      toast.success("Dossier lock settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save dossier lock settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      title="Dossier Lock Settings"
      description="Control global freeze and unfreeze behavior for dossier forms."
    >
      <main className="space-y-6 p-6">
        <BreadcrumbNav
          paths={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "General Management", href: "/dashboard/genmgmt?tab=settings" },
            { label: "Dossier Lock Settings" },
          ]}
        />

        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-primary">Dossier Lock Settings</h2>
            <p className="text-muted-foreground">
              These settings are the global backend source of truth for dossier freeze behavior.
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

        <Card>
          <CardHeader>
            <CardTitle>Global Dossier Lock Policy</CardTitle>
            <CardDescription>
              `Follow Current Semester` preserves the current semester-based lock behavior. The other modes override
              that behavior globally until changed again by a super admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div role="radiogroup" aria-label="Global dossier lock policy">
              <div className="grid gap-4 lg:grid-cols-3">
                {LOCK_POLICY_OPTIONS.map((option) => (
                  <Label
                    key={option.value}
                    htmlFor={option.value}
                    className={`flex cursor-pointer flex-col gap-3 rounded-lg border p-4 ${
                      lockPolicy === option.value ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        id={option.value}
                        name="dossier-lock-policy"
                        type="radio"
                        value={option.value}
                        checked={lockPolicy === option.value}
                        onChange={() => setLockPolicy(option.value)}
                        className="h-4 w-4"
                      />
                      <span className="font-medium text-foreground">{option.title}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{option.description}</span>
                  </Label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </DashboardLayout>
  );
}
