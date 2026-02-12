"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDeviceSiteSettings } from "@/hooks/useDeviceSiteSettings";
import { toast } from "sonner";
import {
  DEFAULT_DEVICE_SITE_SETTINGS,
  commitDeviceSiteSettings,
  ensureClientDeviceContext,
  readStoredDeviceSiteSettings,
  sanitizeDeviceSiteSettings,
  type DeviceSiteSettings,
} from "@/lib/device-site-settings";
import {
  ACCENT_PALETTE_KEYS,
  ACCENT_PALETTE_META,
  type AccentPaletteKey,
} from "@/lib/accent-palette";
import { formatInDefaultTimezone } from "@/lib/timezone";

type FormState = {
  themeMode: DeviceSiteSettings["themeMode"];
  themePreset: DeviceSiteSettings["themePreset"];
  accentPalette: DeviceSiteSettings["accentPalette"];
  density: DeviceSiteSettings["density"];
  language: DeviceSiteSettings["language"];
  timezone: DeviceSiteSettings["timezone"];
  refreshIntervalSec: number;
};

const DEFAULT_FORM_STATE: FormState = {
  themeMode: DEFAULT_DEVICE_SITE_SETTINGS.themeMode,
  themePreset: DEFAULT_DEVICE_SITE_SETTINGS.themePreset,
  accentPalette: DEFAULT_DEVICE_SITE_SETTINGS.accentPalette,
  density: DEFAULT_DEVICE_SITE_SETTINGS.density,
  language: DEFAULT_DEVICE_SITE_SETTINGS.language,
  timezone: DEFAULT_DEVICE_SITE_SETTINGS.timezone,
  refreshIntervalSec: DEFAULT_DEVICE_SITE_SETTINGS.refreshIntervalSec,
};

function AccentSwatch({ palette }: { palette: AccentPaletteKey }) {
  const meta = ACCENT_PALETTE_META[palette];
  return (
    <span
      className="inline-block h-[10px] w-[10px] rounded-full border border-border/60"
      style={{ backgroundColor: meta.swatch }}
      aria-hidden
    />
  );
}

export default function DeviceSiteSettingsPage() {
  const [currentDeviceId, setCurrentDeviceId] = useState("");
  const [lookupDeviceId, setLookupDeviceId] = useState("");
  const [activeDeviceId, setActiveDeviceId] = useState("");
  const [form, setForm] = useState<FormState>(DEFAULT_FORM_STATE);

  const { query, update } = useDeviceSiteSettings(activeDeviceId);

  useEffect(() => {
    const resolvedDeviceId = ensureClientDeviceContext();
    setCurrentDeviceId(resolvedDeviceId);
    setLookupDeviceId(resolvedDeviceId);
    setActiveDeviceId(resolvedDeviceId);
  }, []);

  useEffect(() => {
    const settings = query.data?.settings;
    if (!settings) return;

    const stored = readStoredDeviceSiteSettings();
    const resolvedThemeMode =
      isEditingCurrentDevice && stored?.themeMode && stored.themeMode !== "system"
        ? stored.themeMode
        : settings.themeMode;

    setForm({
      themeMode: resolvedThemeMode,
      themePreset: settings.themePreset,
      accentPalette: settings.accentPalette,
      density: settings.density,
      language: settings.language,
      timezone: settings.timezone,
      refreshIntervalSec: settings.refreshIntervalSec,
    });
  }, [query.data?.settings, isEditingCurrentDevice]);

  const isEditingCurrentDevice = useMemo(
    () => Boolean(activeDeviceId) && activeDeviceId === currentDeviceId,
    [activeDeviceId, currentDeviceId]
  );

  const applyPreviewForCurrentDevice = (next: FormState) => {
    if (!isEditingCurrentDevice || !currentDeviceId) {
      return;
    }

    commitDeviceSiteSettings(
      sanitizeDeviceSiteSettings({
        ...next,
        deviceId: currentDeviceId,
      })
    );
  };

  const setFormAndPreview = (patch: Partial<FormState>) => {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      applyPreviewForCurrentDevice(next);
      return next;
    });
  };

  const handleLoadDevice = () => {
    const next = lookupDeviceId.trim();
    if (!next) {
      toast.error("Please enter a valid device ID.");
      return;
    }

    setActiveDeviceId(next);
  };

  const handleResetToCurrent = () => {
    if (!currentDeviceId) return;
    setLookupDeviceId(currentDeviceId);
    setActiveDeviceId(currentDeviceId);
  };

  const handleSave = async () => {
    if (!activeDeviceId) return;

    try {
      const response = await update.mutateAsync({
        deviceId: activeDeviceId,
        themeMode: form.themeMode,
        themePreset: form.themePreset,
        accentPalette: form.accentPalette,
        density: form.density,
        language: form.language,
        timezone: form.timezone,
        refreshIntervalSec: Number(form.refreshIntervalSec),
      });

      if (isEditingCurrentDevice && response?.settings) {
        commitDeviceSiteSettings(
          sanitizeDeviceSiteSettings({
            ...response.settings,
            deviceId: currentDeviceId,
          })
        );
      }

      toast.success("Device site settings updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings.");
    }
  };

  const updatedAt = query.data?.settings?.updatedAt;
  const updatedBy = query.data?.settings?.updatedBy;

  return (
    <DashboardLayout
      title="Device Site Settings"
      description="Theme, density, language, timezone, and refresh behavior per device"
    >
      <section className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Target Device</CardTitle>
            <CardDescription>
              Manage current device settings or load a specific device ID for administrative updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="lookup-device-id">Device ID</Label>
                <Input
                  id="lookup-device-id"
                  value={lookupDeviceId}
                  onChange={(event) => setLookupDeviceId(event.target.value)}
                  disabled
                />
              </div>
              <div className="flex items-end gap-2">
                <Button type="button" onClick={handleLoadDevice} className="flex-1">
                  Load Device
                </Button>
                <Button type="button" variant="outline" onClick={handleResetToCurrent}>
                  Current
                </Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Current browser device: <span className="font-mono">{currentDeviceId || "-"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Presentation</CardTitle>
            <CardDescription>
              Theme and density changes apply instantly on the current device.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Theme Mode</Label>
                <Select
                  value={form.themeMode}
                  onValueChange={(value) =>
                    setFormAndPreview({ themeMode: value as FormState["themeMode"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select theme mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Accent Palette</Label>
                <Select
                  value={form.accentPalette}
                  onValueChange={(value) =>
                    setFormAndPreview({ accentPalette: value as FormState["accentPalette"] })
                  }
                >
                  <SelectTrigger>
                    <span className="flex items-center gap-2">
                      <AccentSwatch palette={form.accentPalette} />
                      <span>{ACCENT_PALETTE_META[form.accentPalette].label}</span>
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {ACCENT_PALETTE_KEYS.map((palette) => (
                      <SelectItem key={palette} value={palette}>
                        <span className="flex items-center gap-2">
                          <AccentSwatch palette={palette} />
                          <span>{ACCENT_PALETTE_META[palette].label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Theme Preset</Label>
                <Input value={form.themePreset} readOnly />
              </div>

              <div className="space-y-2">
                <Label>Layout Density</Label>
                <Select
                  value={form.density}
                  onValueChange={(value) =>
                    setFormAndPreview({ density: value as FormState["density"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select density" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Regional and Refresh Settings</CardTitle>
            <CardDescription>
              Language is fixed to English for now; timezone is fixed to Asia/Kolkata.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={form.language}
                  onValueChange={(value) => setFormAndPreview({ language: value as "en" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input value={form.timezone} readOnly />
              </div>

              <div className="space-y-2">
                <Label htmlFor="refresh-interval">Refresh Interval (seconds)</Label>
                <Input
                  id="refresh-interval"
                  type="number"
                  min={10}
                  max={900}
                  value={form.refreshIntervalSec}
                  onChange={(event) =>
                    setFormAndPreview({
                      refreshIntervalSec: Number(event.target.value || DEFAULT_FORM_STATE.refreshIntervalSec),
                    })
                  }
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-xs text-muted-foreground">
                {updatedAt
                  ? `Last updated: ${formatInDefaultTimezone(updatedAt, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}${updatedBy ? ` by ${updatedBy}` : ""}`
                  : "No saved record yet for this device."}
              </div>

              <Button
                type="button"
                onClick={handleSave}
                disabled={!activeDeviceId || query.isLoading || update.isPending}
              >
                {update.isPending ? "Saving..." : "Save Device Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </DashboardLayout>
  );
}
