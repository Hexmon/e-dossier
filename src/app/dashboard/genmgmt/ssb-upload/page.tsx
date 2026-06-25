"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Settings } from "lucide-react";
import { toast } from "sonner";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/components/reports/common/PasswordField";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllCoursesPaged, type CourseResponse } from "@/app/lib/api/courseApi";
import { getAppointments, type Appointment } from "@/app/lib/api/appointmentApi";
import {
  getSsbUploadVisibilitySettings,
  listSsbUploadOcs,
  saveSsbUploadVisibilitySettings,
  uploadSsbPdf,
  type SsbUploadItem,
  type SsbUploadVisibilityDecision,
  type SsbUploadVisibilitySetting,
} from "@/app/lib/api/ssbUploadApi";
import { getFriendlyApiErrorMessage } from "@/app/lib/apiClient";
import { addIsoDays } from "@/app/lib/ssb-upload-visibility";
import { ocTabs } from "@/config/app.config";

type ActiveAppointmentRow = Appointment & { activeCount: number };
type DraftVisibilitySetting = ActiveAppointmentRow & { hiddenDays: number; visibleUntil: string };
type CourseWindow = Pick<SsbUploadVisibilityDecision, "courseStartDate" | "courseEndDate" | "defaultVisibleUntil">;

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function appointmentLabel(row: Pick<Appointment, "positionName" | "positionKey" | "scopeType" | "platoonName" | "username"> & { activeCount?: number }) {
  const scope = row.scopeType === "PLATOON" && row.platoonName ? ` - ${row.platoonName}` : "";
  const count = row.activeCount && row.activeCount > 1 ? ` +${row.activeCount - 1}` : "";
  return `${row.positionName || row.positionKey}${scope}${count}`;
}

export default function SsbUploadPage() {
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [activeAppointments, setActiveAppointments] = useState<ActiveAppointmentRow[]>([]);
  const [courseId, setCourseId] = useState("");
  const [items, setItems] = useState<SsbUploadItem[]>([]);
  const [courseWindow, setCourseWindow] = useState<CourseWindow | null>(null);
  const [visibilitySettings, setVisibilitySettings] = useState<SsbUploadVisibilitySetting[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editOcId, setEditOcId] = useState<string | null>(null);
  const [uploadOc, setUploadOc] = useState<SsbUploadItem | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [visiblePasswordOcId, setVisiblePasswordOcId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAllCoursesPaged()
      .then((res) => setCourses(res.items ?? []))
      .catch((error) => toast.error(getFriendlyApiErrorMessage(error, "Failed to load courses")));
    getAppointments({ active: true, includeFuture: false })
      .then((rows) => {
        const byPosition = new Map<string, ActiveAppointmentRow>();
        for (const row of rows) {
          const current = byPosition.get(row.positionId);
          byPosition.set(row.positionId, current ? { ...current, activeCount: current.activeCount + 1 } : { ...row, activeCount: 1 });
        }
        setActiveAppointments(Array.from(byPosition.values()));
      })
      .catch((error) => toast.error(getFriendlyApiErrorMessage(error, "Failed to load active appointments")));
  }, []);

  const loadVisibilitySettings = useCallback((selectedCourseId: string) => {
    setSettingsLoading(true);
    return getSsbUploadVisibilitySettings(selectedCourseId)
      .then((res) => {
        setCourseWindow(res.courseWindow);
        setVisibilitySettings(res.settings ?? []);
      })
      .catch((error) => toast.error(getFriendlyApiErrorMessage(error, "Failed to load SSB visibility settings")))
      .finally(() => setSettingsLoading(false));
  }, []);

  useEffect(() => {
    if (!courseId) {
      setItems([]);
      setCourseWindow(null);
      setVisibilitySettings([]);
      return;
    }

    setLoading(true);
    Promise.all([listSsbUploadOcs(courseId), loadVisibilitySettings(courseId)])
      .then(([res]) => setItems(res.items ?? []))
      .catch((error) => toast.error(getFriendlyApiErrorMessage(error, "Failed to load OCs")))
      .finally(() => setLoading(false));
  }, [courseId, loadVisibilitySettings]);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === courseId),
    [courses, courseId]
  );

  const closeUpload = () => {
    setUploadOc(null);
    setFile(null);
    setPassword("");
  };

  const settingsRows = useMemo<DraftVisibilitySetting[]>(() => {
    const byPosition = new Map(visibilitySettings.map((setting) => [setting.positionId, setting]));
    const fallbackUntil = courseWindow?.defaultVisibleUntil ?? courseWindow?.courseStartDate ?? todayIsoDate();
    return activeAppointments.map((appointment) => {
      const setting = byPosition.get(appointment.positionId);
      return {
        ...appointment,
        hiddenDays: setting?.hiddenDays ?? 0,
        visibleUntil: setting?.visibleUntil ?? fallbackUntil,
      };
    });
  }, [activeAppointments, courseWindow?.courseStartDate, courseWindow?.defaultVisibleUntil, visibilitySettings]);

  const setSettingRow = (positionId: string, patch: Partial<DraftVisibilitySetting>) => {
    setVisibilitySettings((prev) => {
      const appointment = activeAppointments.find((item) => item.positionId === positionId);
      if (!appointment) return prev;
      const existing = prev.find((item) => item.positionId === positionId);
      const next = {
        id: existing?.id ?? positionId,
        courseId,
        positionId,
        positionKey: appointment.positionKey,
        positionName: appointment.positionName,
        hiddenDays: existing?.hiddenDays ?? 0,
        visibleUntil: existing?.visibleUntil ?? courseWindow?.defaultVisibleUntil ?? courseWindow?.courseStartDate ?? todayIsoDate(),
        ...patch,
      };
      return [...prev.filter((item) => item.positionId !== positionId), next];
    });
  };

  const saveSettings = async () => {
    if (!courseId || !courseWindow?.courseStartDate) return;
    setSettingsSaving(true);
    try {
      const res = await saveSsbUploadVisibilitySettings({
        courseId,
        settings: settingsRows.map(({ positionId, hiddenDays, visibleUntil }) => ({ positionId, hiddenDays, visibleUntil })),
      });
      setCourseWindow(res.courseWindow);
      setVisibilitySettings(res.settings ?? []);
      toast.success("SSB visibility settings saved.");
      setSettingsOpen(false);
    } catch (error) {
      toast.error(getFriendlyApiErrorMessage(error, "Failed to save SSB visibility settings"));
    } finally {
      setSettingsSaving(false);
    }
  };

  const saveUpload = async () => {
    if (!uploadOc || !file || !password.trim()) return;
    const submittedPassword = password.trim();
    setSaving(true);
    try {
      const res = await uploadSsbPdf(uploadOc.ocId, { file, password: submittedPassword });
      setItems((prev) => prev.map((item) => (
        item.ocId === uploadOc.ocId ? { ...item, ...res.item, hasUpload: true } : item
      )));
      toast.success("SSB PDF uploaded.");
      closeUpload();
    } catch (error) {
      toast.error(getFriendlyApiErrorMessage(error, "Failed to upload SSB PDF"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="SSB Upload" description="Upload encrypted course-wise SSB PDFs.">
      <div className="p-6">
        <BreadcrumbNav
          paths={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Admin Management", href: "/dashboard/genmgmt?tab=Gen%20Mgmt" },
            { label: "SSB Upload" },
          ]}
        />

        <GlobalTabs tabs={ocTabs} defaultValue="ssb-upload">
          <TabsContent value="ssb-upload" className="space-y-6">
            <Card>
              <CardHeader className="gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Configure Settings</CardTitle>
                  <CardDescription>
                    Set appointment-wise SSB PDF visibility from the course start date.
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" disabled={!courseId || settingsLoading} onClick={() => setSettingsOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configure Settings
                </Button>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                <div>Course start: <span className="font-medium text-foreground">{courseWindow?.courseStartDate ? formatDate(courseWindow.courseStartDate) : "Select a course"}</span></div>
                <div>Course end: <span className="font-medium text-foreground">{formatDate(courseWindow?.courseEndDate)}</span></div>
                <div>Default visibility date: <span className="font-medium text-foreground">{formatDate(courseWindow?.defaultVisibleUntil)}</span></div>
              </CardContent>
            </Card>

            <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <Label>Course</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger className="w-72">
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.code} {course.title ? `- ${course.title}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedCourse ? (
                <p className="text-sm text-muted-foreground">
                  {items.length} OC{items.length === 1 ? "" : "s"} in {selectedCourse.code}
                </p>
              ) : null}
            </section>

            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold">OC No</th>
                    <th className="px-4 py-3 font-semibold">OC Name</th>
                    <th className="px-4 py-3 font-semibold">SSB PDF</th>
                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {!courseId ? (
                    <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={4}>Select a course to list OCs.</td></tr>
                  ) : loading ? (
                    <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={4}>Loading OCs...</td></tr>
                  ) : items.length === 0 ? (
                    <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={4}>No OCs found for this course.</td></tr>
                  ) : items.map((item) => {
                    const editing = editOcId === item.ocId;
                    const savedPassword = item.savedPassword;
                    const passwordVisible = visiblePasswordOcId === item.ocId;
                    return (
                      <tr key={item.ocId} className="border-t">
                        <td className="px-4 py-3 font-medium">{item.ocNo}</td>
                        <td className="px-4 py-3">{item.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.hasUpload ? item.fileName || "Uploaded" : "Not uploaded"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setEditOcId(editing ? null : item.ocId)}>
                              {editing ? "Cancel" : "Edit"}
                            </Button>
                            {editing ? (
                              <>
                                {savedPassword ? (
                                  <div className="flex items-center gap-2">
                                    {passwordVisible ? (
                                      <span className="max-w-40 truncate text-xs text-muted-foreground">
                                        {savedPassword}
                                      </span>
                                    ) : null}
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon-sm"
                                      className="hover:bg-primary/10 hover:text-primary"
                                      onClick={() => setVisiblePasswordOcId(passwordVisible ? null : item.ocId)}
                                      aria-label={`${passwordVisible ? "Hide" : "Show"} saved SSB password for ${item.ocNo}`}
                                    >
                                      {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                  </div>
                                ) : null}
                                <Button type="button" size="sm" onClick={() => setUploadOc(item)}>
                                  Upload
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </GlobalTabs>
      </div>

      <Dialog open={Boolean(uploadOc)} onOpenChange={(open) => { if (!open) closeUpload(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload SSB PDF</DialogTitle>
            <DialogDescription>
              {uploadOc ? `${uploadOc.ocNo} - ${uploadOc.name}` : "Select a PDF and password."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>PDF</Label>
              <Input type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <PasswordField value={password} onChange={setPassword} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeUpload}>Cancel</Button>
            <Button type="button" disabled={!file || !password.trim() || saving} onClick={saveUpload}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-[96vw] xl:max-w-[1280px]">
          <DialogHeader>
            <DialogTitle>Configure SSB PDF Visibility</DialogTitle>
            <DialogDescription>
              {selectedCourse ? `${selectedCourse.code} - ${selectedCourse.title}` : "Select a course to configure appointment visibility."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 rounded-md border bg-muted/20 p-4 text-sm sm:grid-cols-4">
            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground">Course Start</div>
              <div className="mt-1 font-semibold">{formatDate(courseWindow?.courseStartDate)}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground">Course End</div>
              <div className="mt-1 font-semibold">{formatDate(courseWindow?.courseEndDate)}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground">Default Visibility Date</div>
              <div className="mt-1 font-semibold">{formatDate(courseWindow?.defaultVisibleUntil)}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground">Active Appointments</div>
              <div className="mt-1 font-semibold">{settingsRows.length}</div>
            </div>
          </div>
          <div className="max-h-[58vh] overflow-y-auto overflow-x-hidden rounded-md border">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[26%]" />
              </colgroup>
              <thead className="sticky top-0 bg-muted text-left shadow-sm">
                <tr>
                  <th className="px-2 py-2 font-semibold sm:px-3">Appointment</th>
                  <th className="whitespace-nowrap px-2 py-2 font-semibold sm:px-3">Course Start</th>
                  <th className="whitespace-nowrap px-2 py-2 font-semibold sm:px-3">Hidden Days</th>
                  <th className="whitespace-nowrap px-2 py-2 font-semibold sm:px-3">Visible From</th>
                  <th className="whitespace-nowrap px-2 py-2 font-semibold sm:px-3">Course End</th>
                  <th className="whitespace-nowrap px-2 py-2 font-semibold sm:px-3">Visible Until</th>
                </tr>
              </thead>
              <tbody>
                {settingsRows.length === 0 ? (
                  <tr><td className="px-3 py-8 text-center text-muted-foreground" colSpan={6}>No current active appointments found.</td></tr>
                ) : settingsRows.map((row) => {
                  return (
                    <tr key={row.positionId} className="border-t align-top hover:bg-muted/30">
                      <td className="break-words px-2 py-3 sm:px-3">
                        <div className="font-medium leading-snug">{appointmentLabel(row)}</div>
                        <div className="mt-1 break-all text-xs text-muted-foreground">{row.username}</div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-muted-foreground sm:px-3">{formatDate(courseWindow?.courseStartDate)}</td>
                      <td className="px-2 py-3 sm:px-3">
                        <Input
                          type="number"
                          min={0}
                          max={3650}
                          value={row.hiddenDays}
                          className="min-w-0 max-w-24"
                          onChange={(event) => setSettingRow(row.positionId, { hiddenDays: Math.max(0, Number(event.target.value) || 0) })}
                        />
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-muted-foreground sm:px-3">{formatDate(addIsoDays(courseWindow?.courseStartDate, row.hiddenDays))}</td>
                      <td className="whitespace-nowrap px-2 py-3 text-muted-foreground sm:px-3">{formatDate(courseWindow?.courseEndDate)}</td>
                      <td className="px-2 py-3 sm:px-3">
                        <Input
                          type="date"
                          value={row.visibleUntil}
                          className="min-w-0 max-w-44"
                          min={courseWindow?.defaultVisibleUntil ?? courseWindow?.courseStartDate ?? undefined}
                          onChange={(event) => setSettingRow(row.positionId, { visibleUntil: event.target.value })}
                        />
                        <div className="mt-1 text-xs text-muted-foreground">{formatDate(row.visibleUntil)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSettingsOpen(false)}>Cancel</Button>
            <Button type="button" disabled={!courseWindow?.courseStartDate || settingsSaving} onClick={saveSettings}>
              {settingsSaving ? "Saving..." : "Save Settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
