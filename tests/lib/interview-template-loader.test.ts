import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequestMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/lib/apiClient", () => ({
  apiRequest: apiRequestMock,
}));

import {
  clearInterviewTemplateCache,
  loadInterviewTemplates,
} from "@/lib/interviewTemplateLoader";

function template(id: string) {
  return {
    id,
    code: `CODE-${id}`,
    title: `Template ${id}`,
    semesters: [1],
    sections: [],
    groups: [],
  };
}

describe("interview template loading", () => {
  beforeEach(() => {
    clearInterviewTemplateCache();
    apiRequestMock.mockReset();
  });

  it("requests templates for the cadet's course with legacy fallback", async () => {
    apiRequestMock.mockResolvedValue({ items: [template("course-a-template")] });

    const templates = await loadInterviewTemplates("course-a");

    expect(apiRequestMock).toHaveBeenCalledWith({
      method: "GET",
      endpoint:
        "/api/v1/admin/interview/templates?hydrate=true&courseId=course-a&fallbackToLegacyGlobal=true",
    });
    expect(templates.map((item) => item.id)).toEqual(["course-a-template"]);
  });

  it("isolates cached templates by course", async () => {
    apiRequestMock
      .mockResolvedValueOnce({ items: [template("course-a-template")] })
      .mockResolvedValueOnce({ items: [template("course-b-template")] });

    const courseA = await loadInterviewTemplates("course-a");
    const courseB = await loadInterviewTemplates("course-b");
    const cachedCourseA = await loadInterviewTemplates("course-a");

    expect(courseA[0]?.id).toBe("course-a-template");
    expect(courseB[0]?.id).toBe("course-b-template");
    expect(cachedCourseA[0]?.id).toBe("course-a-template");
    expect(apiRequestMock).toHaveBeenCalledTimes(2);
  });

  it("keeps the legacy global request when no course is known", async () => {
    apiRequestMock.mockResolvedValue({ items: [] });

    await loadInterviewTemplates();

    expect(apiRequestMock).toHaveBeenCalledWith({
      method: "GET",
      endpoint: "/api/v1/admin/interview/templates?hydrate=true",
    });
  });
});
