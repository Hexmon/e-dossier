import { describe, expect, it } from "vitest";

import { filterOCsForManagement } from "@/hooks/useOCs";
import type { OCListRow } from "@/app/lib/api/ocApi";

const rows = [
  {
    id: "oc-1",
    name: "Aaryan Prashar",
    ocNo: "7517",
    courseId: "course-1",
    platoonId: "platoon-1",
    branch: "E",
    currentSemester: 1,
  },
  {
    id: "oc-2",
    name: "Abhyuday Singh",
    ocNo: "7515",
    courseId: "course-1",
    platoonId: "platoon-2",
    branch: "M",
    currentSemester: 2,
  },
  {
    id: "oc-3",
    name: "Semester Three Cadet",
    ocNo: "7519",
    courseId: "course-2",
    platoonId: null,
    branch: "O",
    currentSemester: 3,
  },
] as OCListRow[];

describe("OC management filters", () => {
  it("filters OCs by current semester", () => {
    expect(filterOCsForManagement(rows, { semester: 1 }).map((oc) => oc.id)).toEqual(["oc-1"]);
    expect(filterOCsForManagement(rows, { semester: 2 }).map((oc) => oc.id)).toEqual([
      "oc-2",
    ]);
    expect(filterOCsForManagement(rows, { semester: 3 }).map((oc) => oc.id)).toEqual([
      "oc-3",
    ]);
  });

  it("keeps semester filtering compatible with existing OC filters", () => {
    const result = filterOCsForManagement(rows, {
      courseId: "course-1",
      platoonId: "platoon-2",
      branch: "M",
      q: "abhyuday",
      semester: 2,
    });

    expect(result.map((oc) => oc.id)).toEqual(["oc-2"]);
  });
});
