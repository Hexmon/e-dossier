"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllCourses } from "@/app/lib/api/courseApi";

export type PromotionRelegationCourseOption = {
  id: string;
  code: string;
  title: string;
};

export function usePromotionRelegationCourses() {
  const query = useQuery({
    queryKey: ["promotion-relegation", "courses"],
    queryFn: async () => {
      const response = await getAllCourses();
      return (response.items ?? []).filter((course) => !course.deleted_at);
    },
    staleTime: 60_000,
  });

  const courses = useMemo<PromotionRelegationCourseOption[]>(() => {
    const mapped = (query.data ?? []).map((course) => ({
      id: course.id,
      code: course.code,
      title: course.title,
    }));

    return mapped.sort((a, b) => a.code.localeCompare(b.code));
  }, [query.data]);

  return {
    courses,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
