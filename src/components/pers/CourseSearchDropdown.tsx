"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { searchCourses, type CourseResponse } from "@/app/lib/api/courseApi";
import { useDebounce } from "@/hooks/useDebounce";
import { Loader2 } from "lucide-react";

interface CourseSearchDropdownProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export default function CourseSearchDropdown({
    value,
    onChange,
    disabled = false,
}: CourseSearchDropdownProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [results, setResults] = useState<CourseResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const debouncedQuery = useDebounce(searchQuery, 300);

    // Fetch courses when debounced query changes (only when user types)
    useEffect(() => {
        if (!debouncedQuery || debouncedQuery.trim().length === 0) {
            setResults([]);
            return;
        }

        let cancelled = false;

        const fetchCourses = async () => {
            setLoading(true);
            try {
                const res = await searchCourses(debouncedQuery.trim());
                if (!cancelled) {
                    setResults(res.items ?? []);
                }
            } catch {
                if (!cancelled) {
                    setResults([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchCourses();
        return () => {
            cancelled = true;
        };
    }, [debouncedQuery]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (course: CourseResponse) => {
        onChange(course.code);
        setSearchQuery("");
        setIsOpen(false);
        setResults([]);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setIsOpen(true);
    };

    const handleFocus = () => {
        if (searchQuery.trim().length > 0) {
            setIsOpen(true);
        }
    };

    return (
        <div ref={containerRef} className="relative">
            <Input
                value={isOpen ? searchQuery : value || ""}
                onChange={handleInputChange}
                onFocus={handleFocus}
                placeholder={value ? value : "Search course..."}
                disabled={disabled}
            />

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
                    {loading && (
                        <div className="flex items-center justify-center p-3 text-sm text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Searching...
                        </div>
                    )}

                    {!loading && results.length === 0 && debouncedQuery.trim().length > 0 && (
                        <div className="p-3 text-sm text-muted-foreground text-center">
                            No courses found
                        </div>
                    )}

                    {!loading && debouncedQuery.trim().length === 0 && (
                        <div className="p-3 text-sm text-muted-foreground text-center">
                            Type to search courses...
                        </div>
                    )}

                    {!loading &&
                        results.map((course) => (
                            <button
                                key={course.id}
                                type="button"
                                className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                                onClick={() => handleSelect(course)}
                            >
                                <span className="font-medium">{course.code}</span>
                                <span className="text-xs text-muted-foreground">
                                    {course.title}
                                </span>
                            </button>
                        ))}
                </div>
            )}
        </div>
    );
}
