"use client";

import { useMemo, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { TabsContent } from "@/components/ui/tabs";
import CourseCard from "@/components/courses/CourseCard";
import CourseFormModal from "@/components/courses/CourseFormModal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ocTabs } from "@/config/app.config";
import { useCourses, type UICourse } from "@/hooks/useCourses";

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

  const handleDelete = async (id: string) => {
    await removeCourse(id);
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
      toast.error("Something went wrong.");
    }
  };

  return (
    <SidebarProvider>
      <section className="flex min-h-screen">
        <AppSidebar />

        <main className="flex flex-col flex-1">
          <PageHeader
            title="Course Management"
            description="Manage all courses efficiently."
          />

          <section className="p-6">
            <BreadcrumbNav
              paths={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Admin Mgmt", href: "/dashboard/genmgmt" },
                { label: "Course Management" },
              ]}
            />

            <GlobalTabs tabs={ocTabs} defaultValue="course-mgmt">
              <TabsContent value="course-mgmt">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Course Sections</h2>
                  <Button onClick={handleAdd} className="bg-success">
                    Add Course
                  </Button>
                </div>

                {loading ? (
                  <p>Loading...</p>
                ) : filtered.length === 0 ? (
                  <p>No courses found.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((course) => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onView={() => { }}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </GlobalTabs>
          </section>
        </main>
      </section>

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
    </SidebarProvider>
  );
}