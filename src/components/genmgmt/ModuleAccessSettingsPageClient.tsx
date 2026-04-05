"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  moduleAccessAdminApi,
  type ModuleAccessSettingsResponse,
} from "@/app/lib/api/moduleAccessAdminApi";
import {
  emptyModuleAccessDraft,
  reconcileModuleAccessDraft,
  toModuleAccessDraft,
  type ModuleAccessDraft,
} from "@/app/lib/module-access-draft";

const MODULE_TOGGLES: Array<{
  key: keyof ModuleAccessDraft;
  title: string;
  description: string;
}> = [
  {
    key: "adminCanAccessDossier",
    title: "Dossier Management",
    description:
      "Controls the dossier sidebar section, the /dashboard/[id]/milmgmt pages, and dossier-specific OC APIs for ADMIN users.",
  },
  {
    key: "adminCanAccessBulkUpload",
    title: "Bulk Upload",
    description:
      "Controls the bulk-upload hub and baseline access to bulk Academics/PT pages and APIs for ADMIN users.",
  },
  {
    key: "adminCanAccessReports",
    title: "Reports",
    description:
      "Controls the reports sidebar section, /dashboard/reports, and /api/v1/reports/* for ADMIN users.",
  },
];

type ModuleAccessSettingsPageClientProps = {
  initialSettings: ModuleAccessSettingsResponse["settings"];
};

export default function ModuleAccessSettingsPageClient({
  initialSettings,
}: ModuleAccessSettingsPageClientProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<ModuleAccessDraft>(() =>
    toModuleAccessDraft(initialSettings)
  );
  const [hasLocalEdits, setHasLocalEdits] = useState(false);
  const hasLocalEditsRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{
    tone: "success" | "error" | "pending" | null;
    message: string;
  }>({
    tone: null,
    message: "",
  });

  const settingsQuery = useQuery({
    queryKey: ["module-access-settings"],
    queryFn: () => moduleAccessAdminApi.getSettings(),
    initialData: {
      message: "Module access settings retrieved successfully.",
      settings: initialSettings,
    },
    refetchOnMount: false,
  });

  useEffect(() => {
    if (!settingsQuery.data?.settings) return;
    setDraft((current) =>
      reconcileModuleAccessDraft({
        currentDraft: current,
        incomingSettings: settingsQuery.data.settings,
        hasLocalEdits: hasLocalEditsRef.current,
      })
    );
  }, [settingsQuery.data]);

  const handleToggle = (key: keyof ModuleAccessDraft, checked: boolean) => {
    hasLocalEditsRef.current = true;
    setHasLocalEdits(true);
    setDraft((current) => ({
      ...current,
      [key]: checked,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveFeedback({
      tone: "pending",
      message: "Saving module access settings...",
    });
    try {
      const result = await moduleAccessAdminApi.updateSettings(draft);
      const nextDraft = toModuleAccessDraft(result.settings);
      setDraft(nextDraft);
      hasLocalEditsRef.current = false;
      setHasLocalEdits(false);
      queryClient.setQueryData(["module-access-settings"], result);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["module-access-settings"] }),
        queryClient.invalidateQueries({ queryKey: ["navigation", "me"] }),
        queryClient.invalidateQueries({ queryKey: ["me"] }),
      ]);
      setSaveFeedback({
        tone: "success",
        message: "Module access settings saved.",
      });
      toast.success("Module access settings saved.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save module access settings.";
      setSaveFeedback({
        tone: "error",
        message,
      });
      toast.error(message);
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
              These toggles are the backend source of truth for ADMIN access. SUPER_ADMIN
              always keeps full access.
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving || settingsQuery.isLoading}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        <div
          aria-live="polite"
          role={saveFeedback.tone === "error" ? "alert" : "status"}
          className={
            saveFeedback.tone === "error"
              ? "rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
              : saveFeedback.tone === "success"
                ? "rounded-md border border-success/30 bg-success/10 p-4 text-sm text-success-foreground"
                : saveFeedback.tone === "pending"
                  ? "rounded-md border border-info/30 bg-info/10 p-4 text-sm text-info-foreground"
                  : "sr-only"
          }
        >
          {saveFeedback.message || "No save feedback available."}
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
                <CardTitle id={`${toggle.key}-title`}>{toggle.title}</CardTitle>
                <CardDescription id={`${toggle.key}-description`}>
                  {toggle.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4">
                <Label
                  id={`${toggle.key}-label`}
                  htmlFor={toggle.key}
                  className="text-sm font-medium"
                >
                  Allow ADMIN access
                </Label>
                <Switch
                  id={toggle.key}
                  checked={draft[toggle.key]}
                  onCheckedChange={(checked) => handleToggle(toggle.key, checked)}
                  disabled={settingsQuery.isLoading || saving}
                  aria-labelledby={`${toggle.key}-title ${toggle.key}-label`}
                  aria-describedby={`${toggle.key}-description`}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </DashboardLayout>
  );
}
