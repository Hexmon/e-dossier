"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { TabsContent } from "@/components/ui/tabs";
import CourseCard from "@/components/courses/CourseCard";
import CourseFormModal from "@/components/courses/CourseFormModal";
import CourseViewModal from "@/components/courses/CourseViewModal";
import AssignOfferingsDialog from "@/components/offerings/AssignOfferingsDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText } from "lucide-react";
import { useCourses, type UICourse } from "@/hooks/useCourses";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SetupReturnBanner } from "@/components/setup/SetupReturnBanner";

const courseMgmtTabs = [
  {
    value: "course-mgmt",
    title: "Course Management",
    icon: FileText,
    link: "/dashboard/genmgmt/coursemgmt",
  },
];

export default function CourseManagement() {
  const {
    courses,
    loading,
    addCourse,
    editCourse,
    removeCourse,
  } = useCourses();

  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editCourseData, setEditCourseData] = useState<UICourse | null>(null);
  const [viewCourse, setViewCourse] = useState<UICourse | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<UICourse | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return courses.filter(({ courseNo }) =>
      (courseNo ?? "").toLowerCase().includes(q)
    );
  }, [courses, searchQuery]);

  const handleAdd = () => {
    setEditCourseData(null);
    setIsFormOpen(true);
  };

  const handleEdit = (course: UICourse) => {
    setEditCourseData(course);
    setIsFormOpen(true);
  };

  const handleView = (course: UICourse) => {
    setViewCourse(course);
    setIsViewOpen(true);
  };

  const handleDelete = (id: string) => {
    const target = courses.find((course) => course.id === id) ?? null;
    setCourseToDelete(target);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!courseToDelete || deleteLoading) return;

    setDeleteLoading(true);
    try {
      await removeCourse(courseToDelete.id);
      setDeleteConfirmOpen(false);
      setCourseToDelete(null);
    } catch {
      // Toast is handled by the mutation hook.
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSave = async (data: Omit<UICourse, "id">) => {
    try {
      if (editCourseData) {
        await editCourse(editCourseData.id, data);
      } else {
        await addCourse(data);
      }
      setIsFormOpen(false);
      setEditCourseData(null);
    } catch {
      // Error toast is handled in useCourses mutations.
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col">
          <PageHeader
            title="Course Management"
            description="Manage all courses efficiently."
          />

          <main className="flex-1 p-6">
            <BreadcrumbNav
              paths={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Admin Mgmt", href: "/dashboard/genmgmt" },
                { label: "Course Management" },
              ]}
            />

            <SetupReturnBanner
              title="Setup step: Courses"
              description="Create the initial courses here, then return to the setup checklist."
            />

            <GlobalTabs tabs={courseMgmtTabs} defaultValue="course-mgmt">
              <TabsContent value="course-mgmt" className="space-y-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <h2 className="text-2xl font-bold text-foreground">Course Sections</h2>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Input
                      placeholder="Search courses..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full sm:w-64"
                    />
                    <Button variant="outline" onClick={() => setAssignDialogOpen(true)}>
                      Assign Offerings
                    </Button>
                    <Button onClick={handleAdd} className="bg-success">
                      Add Course
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {loading ? "Loading courses..." : `${filtered.length} course${filtered.length === 1 ? "" : "s"}`}
                    </span>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-12">Loading...</div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No courses found.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((course) => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onView={handleView}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </GlobalTabs>
          </main>
        </div>
      </div>

      <CourseFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditCourseData(null);
        }}
        onSave={handleSave}
        course={editCourseData}
        mode={editCourseData ? "edit" : "add"}
      />

      <CourseViewModal
        open={isViewOpen}
        courseId={viewCourse?.id ?? null}
        courseName={viewCourse?.courseNo ?? null}
        onOpenChange={(open) => {
          setIsViewOpen(open);
          if (!open) setViewCourse(null);
        }}
      />

      <AssignOfferingsDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        courses={courses}
      />

      <AlertDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          if (deleteLoading) return;
          setDeleteConfirmOpen(open);
          if (!open) setCourseToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete course?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
              {courseToDelete?.courseNo ? ` (${courseToDelete.courseNo})` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteLoading}
              onClick={() => {
                setDeleteConfirmOpen(false);
                setCourseToDelete(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? "Deleting..." : "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
