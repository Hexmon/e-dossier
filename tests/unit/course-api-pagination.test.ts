import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/apiClient", () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from "@/app/lib/apiClient";
import { getAllCoursesPaged } from "@/app/lib/api/courseApi";

describe("getAllCoursesPaged", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads course pages using the API's 200 row limit", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        items: Array.from({ length: 200 }, (_, index) => ({
          id: `course-${index}`,
          code: `C-${index}`,
          title: `Course ${index}`,
        })),
        count: 200,
        total: 201,
      } as never)
      .mockResolvedValueOnce({
        items: [{ id: "course-200", code: "C-200", title: "Course 200" }],
        count: 1,
        total: 201,
      } as never);

    const result = await getAllCoursesPaged();

    expect(result.items).toHaveLength(201);
    expect(api.get).toHaveBeenNthCalledWith(1, "/api/v1/admin/courses", expect.objectContaining({
      query: expect.objectContaining({ limit: 200, offset: 0 }),
    }));
    expect(api.get).toHaveBeenNthCalledWith(2, "/api/v1/admin/courses", expect.objectContaining({
      query: expect.objectContaining({ limit: 200, offset: 200 }),
    }));
  });
});
