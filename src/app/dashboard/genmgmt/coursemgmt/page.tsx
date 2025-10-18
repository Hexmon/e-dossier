"use client";

import { useState } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/AppSidebar";
import CourseCard from "@/components/courses/CourseCard";
import { Course } from "@/components/courses/CourseCard";
import  DossierSection  from "@/components/courses/DossierSection";
import CourseFormModal from "@/components/courses/CourseFormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SidebarProvider } from "@/components/ui/sidebar";
import {
  FileText,
  BarChart3,
  Settings,
  Plus,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { ocTabs } from "@/config/app.config";

export default function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([
    { id: "1", courseNo: "TES-43", startDate: "10-02-2024", endDate: "10-09-2025", trgModel: 0 },
    { id: "2", courseNo: "TES-44", startDate: "03-01-2022", endDate: "14-12-2024", trgModel: 0 },
    { id: "3", courseNo: "TES-45", startDate: "04-07-2022", endDate: "14-06-2025", trgModel: 0 },
    { id: "4", courseNo: "TES-46", startDate: "02-01-2023", endDate: "11-12-2025", trgModel: 0 },
    { id: "5", courseNo: "TES-47", startDate: "03-07-2023", endDate: "13-06-2026", trgModel: 0 },
    { id: "6", courseNo: "TES-48", startDate: "01-01-2024", endDate: "12-12-2026", trgModel: 0 },
    { id: "7", courseNo: "TES-49", startDate: "01-07-2024", endDate: "12-06-2027", trgModel: 0 },
    { id: "8", courseNo: "TES-49A", startDate: "30-01-2025", endDate: "11-12-2027", trgModel: 0 },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const handleLogout = () => {
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
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

  const handleDeleteCourse = (courseId: string) => {
    setCourses(courses.filter((course) => course.id !== courseId));
    toast({
      title: "Course deleted",
      description: "The course has been successfully deleted.",
      variant: "destructive",
    });
  };

  const handleSaveCourse = (courseData: Omit<Course, "id">) => {
    if (formMode === "add") {
      const newCourse: Course = {
        ...courseData,
        id: Date.now().toString(),
      };
      setCourses([...courses, newCourse]);
      toast({
        title: "Course added",
        description: "New course has been successfully added.",
      });
    } else if (formMode === "edit" && selectedCourse) {
      setCourses(
        courses.map((course) =>
          course.id === selectedCourse.id ? { ...courseData, id: selectedCourse.id } : course
        )
      );
      toast({
        title: "Course updated",
        description: "Course has been successfully updated.",
      });
    }
  };

  const filteredCourses = courses.filter((course) =>
    course.courseNo.toLowerCase().includes(searchQuery.toLowerCase())
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

                {filteredCourses.length === 0 && (
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

      <CourseFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveCourse}
        course={selectedCourse}
        mode={formMode}
      />

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
