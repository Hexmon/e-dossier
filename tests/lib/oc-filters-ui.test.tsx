// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

vi.mock("@/components/ui/searchable-select", async () => {
  const React = await import("react");
  return {
    default: ({
      placeholder,
      value,
    }: {
      placeholder?: string;
      value?: string;
    }) => React.createElement("button", { type: "button", "data-value": value }, placeholder),
  };
});

import OCFilters, { OC_FILTERS_GRID_CLASS } from "@/components/genmgmt/OCFilters";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("OCFilters", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it("renders semester in the same filter row and emits changes", () => {
    const onSemesterChange = vi.fn();

    act(() => {
      root.render(
        <OCFilters
          search=""
          onSearch={vi.fn()}
          courseFilter=""
          onCourseChange={vi.fn()}
          courses={[]}
          platoonFilter=""
          onPlatoonChange={vi.fn()}
          platoons={[]}
          branchFilter=""
          onBranchChange={vi.fn()}
          statusFilter=""
          onStatusChange={vi.fn()}
          semesterFilter=""
          onSemesterChange={onSemesterChange}
        />
      );
    });

    const grid = container.firstElementChild as HTMLElement;
    expect(grid.className).toBe(OC_FILTERS_GRID_CLASS);
    expect(grid.className).toContain("xl:grid-cols-6");

    const semesterSelect = container.querySelector(
      'select[aria-label="Filter by semester"]'
    ) as HTMLSelectElement;
    expect(semesterSelect).toBeTruthy();
    expect(semesterSelect.textContent).toContain("All Semesters");
    expect(semesterSelect.textContent).toContain("Semester 1");
    expect(semesterSelect.textContent).toContain("Semester 6");

    act(() => {
      semesterSelect.value = "3";
      semesterSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(onSemesterChange).toHaveBeenCalledWith("3");
  });
});
