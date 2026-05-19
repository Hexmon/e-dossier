// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

const mockTransferMutation = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}));

const mockUseRelegationModule = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/hooks/useRelegation", () => ({
  useRelegationModule: mockUseRelegationModule,
  useRelegationActions: () => ({
    exceptionMutation: {
      isPending: false,
      mutateAsync: vi.fn(),
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
      disabled,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
      value?: string;
      disabled?: boolean;
    }) =>
      React.createElement(
        SelectContext.Provider,
        { value: { onValueChange: disabled ? undefined : onValueChange } },
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

import RelegationForm from "@/components/relegation/RelegationForm";
import { toast } from "sonner";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

function getButton(container: HTMLElement, text: string) {
  const button = Array.from(container.querySelectorAll("button")).find((item) =>
    item.textContent?.includes(text)
  );
  expect(button, `button containing "${text}"`).toBeTruthy();
  return button as HTMLButtonElement;
}

describe("RelegationForm previous-semester UI", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockUseRelegationModule.mockImplementation((_currentCourseId, _ocParams, targetMode) => ({
      ocOptionsQuery: {
        data: [
          {
            ocId: "11111111-1111-4111-8111-111111111111",
            ocNo: "7517",
            ocName: "Aaryan Prashar",
            status: "ACTIVE",
            isActive: true,
            currentSemester: 4,
            platoonId: "platoon-1",
            platoonKey: "KARNA",
            platoonName: "Karna",
            currentCourseId: "22222222-2222-4222-8222-222222222222",
            currentCourseCode: "TES-50",
          },
        ],
        isLoading: false,
        isError: false,
      },
      nextCoursesQuery: {
        data:
          targetMode === "COURSE_TRANSFER"
            ? [
                {
                  courseId: "33333333-3333-4333-8333-333333333333",
                  courseCode: "TES-49",
                  courseName: "Course TES-49",
                },
                {
                  courseId: "44444444-4444-4444-8444-444444444444",
                  courseCode: "TES-51",
                  courseName: "Course TES-51",
                },
              ]
            : [
                {
                  courseId: "44444444-4444-4444-8444-444444444444",
                  courseCode: "TES-51",
                  courseName: "Course TES-51",
                },
              ],
        isLoading: false,
        isError: false,
      },
      presignMutation: {
        isPending: false,
        mutateAsync: vi.fn(),
      },
      transferMutation: {
        isPending: false,
        mutateAsync: mockTransferMutation.mutateAsync,
      },
    }));
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it("shows the previous-semester target and cleanup warning for a semester 4 OC", () => {
    act(() => {
      root.render(<RelegationForm />);
    });

    act(() => {
      getButton(container, "7517 | Aaryan Prashar").click();
    });
    act(() => {
      getButton(container, "TES-51 | Course TES-51").click();
    });

    expect(container.textContent).toContain("Previous semester relegation");
    expect(container.textContent).toContain("TES-50 semester 4");
    expect(container.textContent).toContain("TES-51 semester 3");
    expect(container.textContent).toContain("semester 4 and later will be deleted");
    expect((container.querySelector("#targetSemester") as HTMLInputElement).value).toBe("Semester 3");
  });

  it("shows all non-current course targets in course-transfer mode", () => {
    act(() => {
      root.render(<RelegationForm />);
    });

    act(() => {
      getButton(container, "7517 | Aaryan Prashar").click();
    });
    act(() => {
      getButton(container, "Course transfer").click();
    });

    expect(container.textContent).toContain("TES-49 | Course TES-49");
    expect(container.textContent).toContain("TES-51 | Course TES-51");
    expect(container.textContent).not.toContain("TES-50 | Course TES-50");
    expect(mockUseRelegationModule).toHaveBeenLastCalledWith(
      "22222222-2222-4222-8222-222222222222",
      undefined,
      "COURSE_TRANSFER"
    );
  });

  it("toasts a friendly error when the required relegation target course is not configured", () => {
    const error = new Error(
      "Relegation target course TES-51 is not configured. Create TES-51 in Course Management before previous-semester relegation."
    );

    mockUseRelegationModule.mockImplementation((currentCourseId, _ocParams, targetMode) => ({
      ocOptionsQuery: {
        data: [
          {
            ocId: "11111111-1111-4111-8111-111111111111",
            ocNo: "7517",
            ocName: "Aaryan Prashar",
            status: "ACTIVE",
            isActive: true,
            currentSemester: 4,
            platoonId: "platoon-1",
            platoonKey: "KARNA",
            platoonName: "Karna",
            currentCourseId: "22222222-2222-4222-8222-222222222222",
            currentCourseCode: "TES-50",
          },
        ],
        isLoading: false,
        isError: false,
      },
      nextCoursesQuery:
        currentCourseId && targetMode === "PREVIOUS_SEMESTER"
          ? {
              data: [],
              isLoading: false,
              isError: true,
              error,
            }
          : {
              data: [],
              isLoading: false,
              isError: false,
              error: null,
            },
      presignMutation: {
        isPending: false,
        mutateAsync: vi.fn(),
      },
      transferMutation: {
        isPending: false,
        mutateAsync: mockTransferMutation.mutateAsync,
      },
    }));

    act(() => {
      root.render(<RelegationForm />);
    });

    act(() => {
      getButton(container, "7517 | Aaryan Prashar").click();
    });

    expect(toast.error).toHaveBeenCalledWith(error.message);
    expect(container.textContent).toContain(error.message);
  });
});
