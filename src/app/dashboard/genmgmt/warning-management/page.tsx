"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Stethoscope } from "lucide-react";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getAppointments } from "@/app/lib/api/appointmentApi";
import {
  warningManagementApi,
  type MedicalWarningCriterion,
  type WarningCriterion,
} from "@/app/lib/api/warningManagementApi";
import {
  buildMedicalWarningCriteriaForActiveAppointments,
  buildWarningCriteriaForActiveAppointments,
  normalizePositionKey,
  warningAppointmentPositionKey,
  WARNING_POLICY_REFERENCE,
} from "@/app/lib/warning-management";

function triggerLabel(value: WarningCriterion["triggerType"]) {
  return value === "TWO_TERM_CUMULATIVE" ? "Two consecutive terms" : "Single term";
}

export default function WarningManagementPage() {
  const [draft, setDraft] = useState<WarningCriterion[]>([]);
  const [medicalDraft, setMedicalDraft] = useState<MedicalWarningCriterion[]>([]);
  const [savingDiscipline, setSavingDiscipline] = useState(false);
  const [savingMedical, setSavingMedical] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ["warning-management-settings"],
    queryFn: () => warningManagementApi.getSettings(),
  });
  const appointmentsQuery = useQuery({
    queryKey: ["warning-management-appointments"],
    queryFn: () => getAppointments({ active: true, includeFuture: false }),
  });

  const appointmentPositions = useMemo(() => {
    const map = new Map<string, { positionKey: string; positionName: string; policyKey: string; holders: number }>();
    for (const appointment of appointmentsQuery.data ?? []) {
      const key = warningAppointmentPositionKey(appointment.id);
      if (!key) continue;
      map.set(key, {
        positionKey: key,
        positionName: appointment.positionName || appointment.positionKey || key,
        policyKey: normalizePositionKey(`${appointment.positionKey ?? ""} ${appointment.positionName ?? ""}`),
        holders: 1,
      });
    }
    return map;
  }, [appointmentsQuery.data]);

  useEffect(() => {
    if (!settingsQuery.data?.criteria) return;
    setDraft(buildWarningCriteriaForActiveAppointments(
      settingsQuery.data.criteria,
      Array.from(appointmentPositions.values()),
    ) as WarningCriterion[]);
    setMedicalDraft(buildMedicalWarningCriteriaForActiveAppointments(
      settingsQuery.data.medicalCriteria ?? [],
      Array.from(appointmentPositions.values()),
    ) as MedicalWarningCriterion[]);
  }, [appointmentPositions, settingsQuery.data]);

  const updateDraft = (criterionKey: string, patch: Partial<WarningCriterion>) => {
    setDraft((current) =>
      current.map((criterion) =>
        criterion.criterionKey === criterionKey ? { ...criterion, ...patch } : criterion,
      ),
    );
  };

  const updateMedicalDraft = (criterionKey: string, patch: Partial<MedicalWarningCriterion>) => {
    setMedicalDraft((current) =>
      current.map((criterion) =>
        criterion.criterionKey === criterionKey ? { ...criterion, ...patch } : criterion,
      ),
    );
  };

  const handleSaveDiscipline = async () => {
    setSavingDiscipline(true);
    try {
      const response = await warningManagementApi.updateSettings({ criteria: draft, medicalCriteria: [] });
      setDraft(buildWarningCriteriaForActiveAppointments(
        response.criteria,
        Array.from(appointmentPositions.values()),
      ) as WarningCriterion[]);
      toast.success("Restriction warning settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save restriction warning settings.");
    } finally {
      setSavingDiscipline(false);
    }
  };

  const handleSaveMedical = async () => {
    setSavingMedical(true);
    try {
      const response = await warningManagementApi.updateSettings({ criteria: [], medicalCriteria: medicalDraft });
      setMedicalDraft(buildMedicalWarningCriteriaForActiveAppointments(
        response.medicalCriteria ?? [],
        Array.from(appointmentPositions.values()),
      ) as MedicalWarningCriterion[]);
      toast.success("Medical warning settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save medical warning settings.");
    } finally {
      setSavingMedical(false);
    }
  };

  return (
    <DashboardLayout
      title="Warning Management"
      description="Manage restriction-point thresholds for appointment-based OC warnings."
    >
      <main className="space-y-6 p-6">
        <BreadcrumbNav
          paths={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "General Management", href: "/dashboard/genmgmt?tab=module-mgmt" },
            { label: "Warning Management" },
          ]}
        />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-primary">Warning Management</h2>
            <p className="max-w-4xl text-muted-foreground">{settingsQuery.data?.intro}</p>
            <div className="mt-4 max-w-4xl overflow-x-auto rounded-md border bg-background">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted text-foreground">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Warning label</th>
                    <th className="px-3 py-2 font-semibold">Criterion</th>
                    <th className="px-3 py-2 font-semibold">Policy points</th>
                  </tr>
                </thead>
                <tbody>
                  {WARNING_POLICY_REFERENCE.map((item) => (
                    <tr key={item.criterionKey} className="border-t">
                      <td className="px-3 py-2">{item.positionName}</td>
                      <td className="px-3 py-2">{triggerLabel(item.triggerType)}</td>
                      <td className="px-3 py-2">{item.restrictionPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {(settingsQuery.error || appointmentsQuery.error) ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {((settingsQuery.error || appointmentsQuery.error) as Error).message}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-warning/10 p-2 text-warning">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle>Restriction Warning Criteria</CardTitle>
                  <CardDescription>
                    Active appointments are loaded from Appointment Management. Disabled rows are ignored for notifications.
                  </CardDescription>
                </div>
              </div>
              <Button
                onClick={handleSaveDiscipline}
                disabled={savingDiscipline || settingsQuery.isLoading || appointmentsQuery.isLoading}
              >
                {savingDiscipline ? "Saving..." : "Save Restriction Settings"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {settingsQuery.isLoading || appointmentsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading warning settings...</p>
            ) : draft.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active appointments found.</p>
            ) : (
              draft.map((criterion) => {
                const holders = appointmentPositions.get(criterion.positionKey)?.holders ?? 0;
                return (
                  <div key={criterion.criterionKey} className="grid gap-3 rounded-md border p-4 md:grid-cols-[1.2fr_1fr_160px_120px] md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{criterion.positionName}</p>
                        <Badge variant={criterion.isEnabled ? "default" : "outline"}>
                          {criterion.isEnabled ? "Enabled" : "Disabled"}
                        </Badge>
                        <Badge variant="secondary">{holders} active</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{triggerLabel(criterion.triggerType)}</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${criterion.criterionKey}-points`}>Restriction points</Label>
                      <Input
                        id={`${criterion.criterionKey}-points`}
                        type="number"
                        min={1}
                        max={999}
                        value={criterion.restrictionPoints}
                        onChange={(event) =>
                          updateDraft(criterion.criterionKey, {
                            restrictionPoints: Math.max(1, Number(event.target.value || 1)),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Criterion</Label>
                      <p className="rounded-md border px-3 py-2 text-sm">{triggerLabel(criterion.triggerType)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={criterion.isEnabled}
                        onCheckedChange={(checked) => updateDraft(criterion.criterionKey, { isEnabled: checked })}
                      />
                      <span className="text-sm text-muted-foreground">Notify</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-info/10 p-2 text-info">
                  <Stethoscope className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle>Medical Warning Criteria</CardTitle>
                  <CardDescription>
                    Configure medical absence-day thresholds per active appointment. Default rows start at 0 days.
                  </CardDescription>
                </div>
              </div>
              <Button
                onClick={handleSaveMedical}
                disabled={savingMedical || settingsQuery.isLoading || appointmentsQuery.isLoading}
              >
                {savingMedical ? "Saving..." : "Save Medical Settings"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {settingsQuery.isLoading || appointmentsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading medical warning settings...</p>
            ) : medicalDraft.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active appointments found.</p>
            ) : (
              medicalDraft.map((criterion) => {
                const holders = appointmentPositions.get(criterion.positionKey)?.holders ?? 0;
                return (
                  <div key={criterion.criterionKey} className="grid gap-3 rounded-md border p-4 md:grid-cols-[1.2fr_1fr_160px_120px] md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{criterion.positionName}</p>
                        <Badge variant={criterion.isEnabled ? "default" : "outline"}>
                          {criterion.isEnabled ? "Enabled" : "Disabled"}
                        </Badge>
                        <Badge variant="secondary">{holders} active</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Medical absence days</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${criterion.criterionKey}-absence-days`}>Absence days</Label>
                      <Input
                        id={`${criterion.criterionKey}-absence-days`}
                        type="number"
                        min={0}
                        max={999}
                        value={criterion.absenceDays}
                        onChange={(event) =>
                          updateMedicalDraft(criterion.criterionKey, {
                            absenceDays: Math.max(0, Number(event.target.value || 0)),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Criterion</Label>
                      <p className="rounded-md border px-3 py-2 text-sm">Absence threshold</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={criterion.isEnabled}
                        onCheckedChange={(checked) => updateMedicalDraft(criterion.criterionKey, { isEnabled: checked })}
                      />
                      <span className="text-sm text-muted-foreground">Notify</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </main>
    </DashboardLayout>
  );
}
