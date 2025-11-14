"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import CourseCard, { Course } from "@/components/courses/CourseCard";
import DossierSection from "@/components/courses/DossierSection";
import CourseFormModal from "@/components/courses/CourseFormModal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SidebarProvider } from "@/components/ui/sidebar";
import { FileText, BarChart3, Settings, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
// ⬇️ removed fallbackCourses here
import { ocTabs } from "@/config/app.config";
import { TabsContent } from "@/components/ui/tabs";
import { createCourse, deleteCourse, getAllCourses, updateCourse } from "@/app/lib/api/courseApi";
import { toast } from "sonner";
import { dossierDetails } from "@/constants/app.constants";

export default function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  //  Fetch courses without fallback
  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await getAllCourses();

      if (response?.items?.length > 0) {
        const mapped = response.items.map((c: any): Course => ({
          id: c.id,
          courseNo: c.code || "",
          startDate: "",
          endDate: "",
          trgModel: 0,
        }));
        setCourses(mapped);
      } else {
        // no items from API – just empty courses and a message
        toast.warning("No courses available.");
        setCourses([]);
      }
    } catch (error: any) {
      toast.error("Failed to fetch courses.");
      // no fallback data, just empty
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  //  Create or update a course
  const handleSaveCourse = async (courseData: Omit<Course, "id">) => {
    if (formMode === "add") {
      try {
        const payload = {
          code: courseData.courseNo,
          title: `Course ${courseData.courseNo}`,
          notes: `Start: ${courseData.startDate}, End: ${courseData.endDate}`,
        };

        const newCourse = await createCourse(payload);

        setCourses((prev) => [
          ...prev,
          {
            id: newCourse.id,
            courseNo: newCourse.code,
            startDate: courseData.startDate,
            endDate: courseData.endDate,
            trgModel: courseData.trgModel,
          },
        ]);

        toast.success(`Course ${newCourse.code} created successfully.`);
      } catch (err: any) {
        console.error("Error creating course:", err);
        toast.error(err.message || "Failed to create course.");
      }
    } else if (formMode === "edit" && selectedCourse) {
      try {
        const payload = {
          code: courseData.courseNo,
          title: `Course ${courseData.courseNo}`,
          notes: `Start: ${courseData.startDate}, End: ${courseData.endDate}`,
        };

        await updateCourse(selectedCourse.id, payload);

        setCourses((prev) =>
          prev.map((c) =>
            c.id === selectedCourse.id ? { ...courseData, id: selectedCourse.id } : c
          )
        );

        toast.success(`Course ${selectedCourse.courseNo} updated successfully.`);
      } catch (err: any) {
        console.error("Error updating course:", err);
        toast.error(err.message || "Failed to update course.");
      }
    }

    setIsFormModalOpen(false);
  };

  //  Handlers
  const handleLogout = () => {
    toast.info("You have been successfully logged out.");
  };

  const handleAddCourse = useCallback(() => {
    setFormMode("add");
    setSelectedCourse(null);
    setIsFormModalOpen(true);
  }, []);

  const handleEditCourse = useCallback((course: Course) => {
    setFormMode("edit");
    setSelectedCourse(course);
    setIsFormModalOpen(true);
  }, []);

  const handleViewCourse = useCallback((course: Course) => {
    setSelectedCourse(course);
    setViewDialogOpen(true);
  }, []);

  const handleDeleteCourse = async (courseId: string) => {
    try {
      await deleteCourse(courseId);
      setCourses((prev) => prev.filter((course) => course.id !== courseId));
      toast.warning("Course deleted successfully.");
    } catch (err: any) {
      console.error("Error deleting course:", err);
      toast.error(err.message || "Failed to delete course.");
    }
  };

  const filteredCourses = useMemo(
    () =>
      courses.filter((course) =>
        ((course.courseNo ?? (course as any).code) ?? "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      ),
    [courses, searchQuery]
  );

  return (
    <SidebarProvider>
      <section className="min-h-screen flex w-full bg-background">
        <aside><AppSidebar /></aside>
        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
            <PageHeader
              title="Course Management"
              description="Manage training courses, assessments, and Officer Cadet development efficiently."
              onLogout={handleLogout}
            />
          </header>

          <section className="flex-1 p-6">
            <nav>
              <BreadcrumbNav
                paths={[
                  { label: "Dashboard", href: "/dashboard" },
                  { label: "Gen Mgmt", href: "/dashboard/genmgmt" },
                  { label: "Course Management" },
                ]}
              />
            </nav>

            <GlobalTabs tabs={ocTabs} defaultValue="course-mgmt">
              <TabsContent value="course-mgmt" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-foreground">Course Sections</h2>
                  <Button onClick={handleAddCourse} disabled={loading} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Course
                  </Button>
                </div>

                {loading ? (
                  <p>Loading courses...</p>
                ) : filteredCourses.length > 0 ? (
                  // ⬇️ this grid only renders real courses (no fallback anymore)
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map((course) => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        onView={handleViewCourse}
                        onEdit={handleEditCourse}
                        onDelete={handleDeleteCourse}
                      />
                    ))}
                  </div>
                ) : (
                  // when no data: just show a "not available" style message
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      No courses available
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery
                        ? "No courses match your search criteria."
                        : "Courses are not available at the moment."}
                    </p>
                    <Button onClick={handleAddCourse}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Course
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="progress" className="space-y-6 text-center py-12">
                <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Progress Analytics
                </h3>
                <p className="text-muted-foreground">
                  Detailed progress tracking and analytics will be available here.
                </p>
              </TabsContent>

              <TabsContent value="dossier" className="space-y-6">
                <DossierSection
                  title="Dossier Filing Details"
                  details={dossierDetails}
                  status="in-progress"
                />
              </TabsContent>

              <TabsContent value="settings" className="space-y-6 text-center py-12">
                <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Settings</h3>
                <p className="text-muted-foreground">
                  Course settings and preferences will be available here.
                </p>
              </TabsContent>
            </GlobalTabs>
          </section>
        </main>
      </section>

      {/* Add/Edit Modal */}
      <CourseFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveCourse}
        course={selectedCourse}
        mode={formMode}
      />

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{selectedCourse?.courseNo}</DialogTitle>
            <DialogDescription>Course details and information</DialogDescription>
          </DialogHeader>
          {selectedCourse && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                  <p className="text-sm">{selectedCourse.startDate}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">End Date</label>
                  <p className="text-sm">{selectedCourse.endDate}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Training Model</label>
                  <p className="text-sm">{selectedCourse.trgModel}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
