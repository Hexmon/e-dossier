import { api } from "@/app/lib/apiClient";
import type { Course } from "@/components/courses/CourseCard";
import { baseURL, endpoints } from "@/constants/endpoints";

// Response shape from your backend
export type GetCoursesResponse = {
    data: Course[];
    total?: number;
};

// Request body type for creating/updating a course
export type CreateCourseRequest = {
    code: string;
    title: string;
    notes?: string;
};

// Response type for a single course
export type CourseResponse = {
    id: string;
    code: string;
    title: string;
    notes?: string;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string | null;
};

/**
 * Fetch all courses (supports query filters)
 */
export async function getAllCourses(
    query = "TES",
    includeDeleted = true
): Promise<GetCoursesResponse> {
    return api.get<GetCoursesResponse>(endpoints.course.all, {
        baseURL,
        query: {
            q: query,
            includeDeleted,
        },
    });
}

/**
 * Create a new course
 */
export async function createCourse(
    data: CreateCourseRequest
): Promise<CourseResponse> {
    return api.post<CourseResponse>(endpoints.course.all, data, { baseURL });
}

/**
 * Update an existing course
 * @param courseId - ID of the course to update
 * @param data - Partial update fields
 */
export async function updateCourse(
    courseId: string,
    data: Partial<CreateCourseRequest>
): Promise<CourseResponse> {
    return api.patch<CourseResponse>(`${endpoints.course.all}/${courseId}`, data, {
        baseURL,
    });
}

/**
 * Delete a course
 * @param courseId - ID of the course to delete
 */
export async function deleteCourse(courseId: string): Promise<void> {
    return api.delete<void>(`${endpoints.course.all}/${courseId}`, { baseURL });
}

export async function fetchCourseById(courseId: string) {
  if (!courseId) throw new Error("Missing courseId");
  const res = await api.get<{ id: string; code: string; title: string }>(
    `${endpoints.course.all}/${courseId}`,
    {
      baseURL,
      query: { expand: "subjects", semester: 1 },
    }
  );
  return res;
}