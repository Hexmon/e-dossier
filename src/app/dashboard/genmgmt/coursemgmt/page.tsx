"use client";

import { useEffect, useState } from "react";
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
import { fallbackCourses, ocTabs } from "@/config/app.config";
import { TabsContent } from "@/components/ui/tabs";
import { createCourse, deleteCourse, getAllCourses, updateCourse } from "@/app/lib/api/courseApi";
import { toast } from "sonner";

export default function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  //  Fetch courses with fallback
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const response = await getAllCourses();
        console.log("courses:", response)

        if (response?.items?.length > 0) {
          const mapped = response.items.map((c: any) => ({
            id: c.id,
            courseNo: c.code || "",
            startDate: "",
            endDate: "",
            trgModel: 0,
          }));
          setCourses(mapped);
        } else {
        console.warn("API returned no data, using fallback.");
        toast.warning("No data received. Showing fallback courses.");
        setCourses(fallbackCourses);
      }
    } catch (error: any) {
      console.error("Error fetching courses:", error);
      toast.error("Failed to fetch courses. Showing fallback data.");
      setCourses(fallbackCourses);
    } finally {
      setLoading(false);
    }
  };

  fetchCourses();
}, [searchQuery]);

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

const handleAddCourse = () => {
  setFormMode("add");
  setSelectedCourse(null);
  setIsFormModalOpen(true);
};

const handleEditCourse = (course: Course) => {
  setFormMode("edit");
  setSelectedCourse(course);
  setIsFormModalOpen(true);
};

const handleViewCourse = (course: Course) => {
  setSelectedCourse(course);
  setViewDialogOpen(true);
};

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

const filteredCourses = courses.filter((course) =>
  ((course.courseNo ?? (course as any).code) ?? "").toLowerCase().includes(searchQuery.toLowerCase())
);



const dossierDetails = [
  { label: "Initiated by", value: "Maj. Kumar, A.K.", editable: true },
  { label: "Opened on", value: "15 Mar 2024", editable: true },
  { label: "Initial Interview", value: "20 Mar 2024", editable: true },
  { label: "Closed by", value: "", editable: true },
  { label: "Closed on", value: "", editable: true },
  { label: "Final Interview", value: "", editable: true },
];

return (
  <SidebarProvider>
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
          <PageHeader
            title="Course Management"
            description="Manage training courses, assessments, and Officer Cadet development efficiently."
            onLogout={handleLogout}
          />
        </header>

        <main className="flex-1 p-6">
          <BreadcrumbNav
            paths={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Gen Mgmt", href: "/dashboard/genmgmt" },
              { label: "Course Management" },
            ]}
          />

          <GlobalTabs tabs={ocTabs} defaultValue="course-mgmt">
            <TabsContent value="course-mgmt" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">Course Sections</h2>
                <Button onClick={handleAddCourse} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Course
                </Button>
              </div>

              {loading ? (
                <p>Loading courses...</p>
              ) : filteredCourses.length > 0 ? (
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
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    No courses found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery
                      ? "No courses match your search criteria."
                      : "No courses available yet."}
                  </p>
                  <Button onClick={handleAddCourse}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Course
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
        </main>
      </div>
    </div>

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
