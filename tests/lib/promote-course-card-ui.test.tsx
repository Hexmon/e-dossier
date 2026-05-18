// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

type MockOcOption = {
  ocId: string;
  ocNo: string;
  ocName: string;
  status: string;
  isActive: boolean;
  currentSemester: number;
  platoonId: string | null;
  platoonKey: string | null;
  platoonName: string | null;
  currentCourseId: string;
  currentCourseCode: string;
};

const mockRelegationState = vi.hoisted(() => ({
  ocOptions: [] as MockOcOption[],
}));

vi.mock("@/app/lib/debounce", () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

vi.mock("@/hooks/useRelegation", () => ({
  useRelegationModule: () => ({
    ocOptionsQuery: {
      data: mockRelegationState.ocOptions,
      isLoading: false,
    },
  }),
  useRelegationActions: () => ({
    promoteCourse: vi.fn(),
    promoteCourseMutation: {
      isPending: false,
    },
  }),
}));

vi.mock("@/components/ui/select", async () => {
  const React = await import("react");
  const SelectContext = React.createContext<{ onValueChange?: (value: string) => void }>({});

  return {
    Select: ({
      children,
      onValueChange,
      value,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
      value?: string;
    }) =>
      React.createElement(
        SelectContext.Provider,
        { value: { onValueChange } },
        React.createElement("div", { "data-select-value": value }, children)
      ),
    SelectTrigger: ({ children }: { children: React.ReactNode }) =>
      React.createElement("div", null, children),
    SelectValue: ({ placeholder }: { placeholder?: string }) =>
      React.createElement("span", null, placeholder),
    SelectContent: ({ children }: { children: React.ReactNode }) =>
      React.createElement("div", null, children),
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => {
      const context = React.useContext(SelectContext);
      return React.createElement(
        "button",
        {
          type: "button",
          onClick: () => context.onValueChange?.(value),
        },
        children
      );
    },
  };
});

import PromoteCourseCard from "@/components/genmgmt/promotion-relegation/PromoteCourseCard";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function getButton(container: HTMLElement, text: string) {
  const button = Array.from(container.querySelectorAll("button")).find((item) =>
    item.textContent?.includes(text)
  );
  expect(button, `button containing "${text}"`).toBeTruthy();
  return button as HTMLButtonElement;
}

function click(button: HTMLButtonElement) {
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("PromoteCourseCard exclusion UI", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    mockRelegationState.ocOptions = [
      {
        ocId: "11111111-1111-4111-8111-111111111111",
        ocNo: "7517",
        ocName: "Aaryan Prashar",
        status: "ACTIVE",
        isActive: true,
        currentSemester: 1,
        platoonId: "platoon-1",
        platoonKey: "KARNA",
        platoonName: "Karna",
        currentCourseId: "course-1",
        currentCourseCode: "TES-50",
      },
      {
        ocId: "22222222-2222-4222-8222-222222222222",
        ocNo: "7515",
        ocName: "Abhyuday Singh",
        status: "ACTIVE",
        isActive: true,
        currentSemester: 1,
        platoonId: "platoon-2",
        platoonKey: "SHIVAJI",
        platoonName: "Shivaji",
        currentCourseId: "course-1",
        currentCourseCode: "TES-50",
      },
    ];
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

  it("makes exclusion and restore decisions clear", () => {
    act(() => {
      root.render(
        <PromoteCourseCard
          courses={[
            {
              id: "course-1",
              code: "TES-50",
              title: "Course TES-50",
            },
          ]}
        />
      );
    });

    click(getButton(container, "TES-50 | Course TES-50"));

    expect(container.textContent).toContain("Promotion Status");
    expect(container.textContent).toContain("Decision");
    expect(container.textContent).toContain("Will promote: 2");
    expect(container.textContent).toContain("Excluded: 0");
    expect(container.textContent).toContain("Will be promoted");

    const excludeButton = getButton(container, "Exclude from promotion");
    expect(excludeButton.className).toContain("bg-destructive");
    click(excludeButton);

    expect(container.textContent).toContain("Will promote: 1");
    expect(container.textContent).toContain("Excluded: 1");
    expect(container.textContent).toContain("Excluded from this batch");
    expect(container.textContent).toContain("Restore to promotion list");
    expect(container.textContent).toContain("Restore all");
    expect(container.textContent).not.toContain("Include");

    click(getButton(container, "Restore all"));

    expect(container.textContent).toContain("Will promote: 2");
    expect(container.textContent).toContain("Excluded: 0");
    expect(container.textContent).not.toContain("Restore to promotion list");
    expect(container.textContent).not.toContain("Restore all");
  });
});
