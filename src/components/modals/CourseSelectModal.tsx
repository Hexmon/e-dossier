"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, BookOpen } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCourses, UICourse } from "@/hooks/useCourses";

interface CourseSelectModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (course: UICourse) => void;
}

export default function CourseSelectModal({
    open,
    onOpenChange,
    onSelect,
}: CourseSelectModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");

    const { courses, loading, fetchCourses } = useCourses();

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch courses when modal opens
    useEffect(() => {
        if (open) {
            fetchCourses();
        }
    }, [open, fetchCourses]);

    // Filter courses based on search query
    const filteredCourses = useMemo(() => {
        if (!debouncedQuery) return courses;

        const query = debouncedQuery.toLowerCase();
        return courses.filter((course) => {
            const { courseNo = "", startDate = "", endDate = "" } = course;
            return (
                courseNo.toLowerCase().includes(query) ||
                startDate.toLowerCase().includes(query) ||
                endDate.toLowerCase().includes(query)
            );
        });
    }, [courses, debouncedQuery]);

    const handleSelectCourse = (course: UICourse) => {
        onSelect(course);
        onOpenChange(false);
        setSearchQuery("");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        Select a Course
                    </DialogTitle>
                    <DialogDescription>
                        Choose a course to manage its offerings
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by course number or dates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Course List */}
                    <div className="h-[400px] overflow-y-auto pr-4">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-sm text-muted-foreground">
                                    Loading courses...
                                </div>
                            </div>
                        ) : filteredCourses.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-sm text-muted-foreground">
                                    {debouncedQuery
                                        ? "No courses found matching your search"
                                        : "No courses available"}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredCourses.map((course) => {
                                    const {
                                        id = "",
                                        courseNo = "N/A",
                                        startDate = "",
                                        endDate = "",
                                    } = course;

                                    return (
                                        <Button
                                            key={id}
                                            variant="outline"
                                            className="w-full justify-start h-auto p-4 hover:bg-accent"
                                            onClick={() => handleSelectCourse(course)}
                                        >
                                            <div className="flex flex-col items-start gap-1 w-full">
                                                <div className="flex items-center justify-between w-full">
                                                    <span className="font-semibold text-base">
                                                        Course {courseNo}
                                                    </span>
                                                </div>
                                                {(startDate || endDate) && (
                                                    <div className="flex gap-2 text-xs text-muted-foreground">
                                                        {startDate && (
                                                            <span>Start: {startDate}</span>
                                                        )}
                                                        {startDate && endDate && (
                                                            <span>•</span>
                                                        )}
                                                        {endDate && (
                                                            <span>End: {endDate}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </Button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}