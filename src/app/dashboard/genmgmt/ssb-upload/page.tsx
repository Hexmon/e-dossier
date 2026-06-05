"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
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
import { getAllCoursesPaged, type CourseResponse } from "@/app/lib/api/courseApi";
import { listSsbUploadOcs, uploadSsbPdf, type SsbUploadItem } from "@/app/lib/api/ssbUploadApi";
import { getFriendlyApiErrorMessage } from "@/app/lib/apiClient";
import { ocTabs } from "@/config/app.config";

export default function SsbUploadPage() {
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [courseId, setCourseId] = useState("");
  const [items, setItems] = useState<SsbUploadItem[]>([]);
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
  }, []);

  useEffect(() => {
    if (!courseId) {
      setItems([]);
      return;
    }

    setLoading(true);
    listSsbUploadOcs(courseId)
      .then((res) => setItems(res.items ?? []))
      .catch((error) => toast.error(getFriendlyApiErrorMessage(error, "Failed to load OCs")))
      .finally(() => setLoading(false));
  }, [courseId]);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === courseId),
    [courses, courseId]
  );

  const closeUpload = () => {
    setUploadOc(null);
    setFile(null);
    setPassword("");
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
    </DashboardLayout>
  );
}
