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

const mockPromoteCourse = vi.hoisted(() => vi.fn());
const mockRelegationApi = vi.hoisted(() => ({
  applyTransfer: vi.fn(),
  presignPdf: vi.fn(),
  cleanupPendingPdf: vi.fn(),
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
    promoteCourse: mockPromoteCourse,
    promoteCourseMutation: {
      isPending: false,
    },
  }),
}));

vi.mock("@/app/lib/api/relegationApi", () => ({
  relegationApi: mockRelegationApi,
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

function getButtonByLabel(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (item) => item.getAttribute("aria-label") === label
  );
  expect(button, `button with aria-label "${label}"`).toBeTruthy();
  return button as HTMLButtonElement;
}

function click(button: HTMLButtonElement) {
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function changeField(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  act(() => {
    const prototype = element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    setter?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

describe("PromoteCourseCard decision UI", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    mockPromoteCourse.mockResolvedValue({
      result: {
        summary: {
          totalEligible: 2,
          excludedByRequest: 1,
          excludedByException: 0,
          promoted: 1,
        },
      },
    });
    mockRelegationApi.applyTransfer.mockResolvedValue({
      transfer: {
        history: {
          movementKind: "SEMESTER_REPEAT",
        },
      },
    });
    mockRelegationApi.presignPdf.mockResolvedValue({
      uploadUrl: "https://upload-url",
      publicUrl: "https://public-url/relegation/pending.pdf",
      objectKey: "relegation/pending.pdf",
      expiresInSeconds: 300,
    });
    mockRelegationApi.cleanupPendingPdf.mockResolvedValue({ deleted: true });
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

  it("shows compact promote/relegate decisions for every OC", () => {
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
    expect(container.textContent).toContain("For relegation: 0");
    expect(container.textContent).toContain("Will be promoted");
    expect(getButtonByLabel(container, "Promote 7517").getAttribute("aria-pressed")).toBe("true");
    expect(getButtonByLabel(container, "Relegate 7517").getAttribute("aria-pressed")).toBe("false");
    expect(getButtonByLabel(container, "Promote 7515").getAttribute("aria-pressed")).toBe("true");
    expect(getButtonByLabel(container, "Relegate 7515").getAttribute("aria-pressed")).toBe("false");

    const relegateButton = getButtonByLabel(container, "Relegate 7517");
    expect(relegateButton.className).toContain("text-destructive");
    click(relegateButton);

    expect(container.textContent).toContain("Will promote: 1");
    expect(container.textContent).toContain("For relegation: 1");
    expect(container.textContent).toContain("Will repeat semester");
    expect(getButtonByLabel(container, "Promote 7517").getAttribute("aria-pressed")).toBe("false");
    expect(getButtonByLabel(container, "Relegate 7517").getAttribute("aria-pressed")).toBe("true");
    expect(container.textContent).toContain("Promote all");
    expect(container.textContent).not.toContain("Include");

    click(getButton(container, "Promote all"));

    expect(container.textContent).toContain("Will promote: 2");
    expect(container.textContent).toContain("For relegation: 0");
    expect(getButtonByLabel(container, "Promote 7517").getAttribute("aria-pressed")).toBe("true");
    expect(getButtonByLabel(container, "Relegate 7517").getAttribute("aria-pressed")).toBe("false");
    expect(container.textContent).not.toContain("Promote all");
  });

  it("shows a guided repeat-semester queue for excluded OCs after promotion", async () => {
    act(() => {
      root.render(
        <PromoteCourseCard
          courses={[
            {
              id: "course-1",
              code: "TES-50",
              title: "Course TES-50",
            },
            {
              id: "course-2",
              code: "TES-51",
              title: "Course TES-51",
            },
          ]}
        />
      );
    });

    click(getButton(container, "TES-50 | Course TES-50"));
    click(getButtonByLabel(container, "Relegate 7517"));

    await act(async () => {
      getButton(container, "Promote Course").click();
    });

    expect(mockPromoteCourse).toHaveBeenCalledWith({
      fromCourseId: "course-1",
      fromSemester: 1,
      excludeOcIds: ["11111111-1111-4111-8111-111111111111"],
      note: null,
    });
    expect(container.textContent).toContain("OCs pending relegation: 1");
    expect(container.textContent).toContain("Relegate selected OCs (1)");

    click(getButton(container, "Relegate selected OCs (1)"));

    expect(container.textContent).toContain("7517 | Aaryan Prashar");
    expect(container.textContent).toContain("Current attempt");
    expect(container.textContent).toContain("Target attempt");
    expect(container.textContent).toContain("TES-50");
    expect(container.textContent).toContain("TES-51");
    expect(container.textContent).toContain("Future-semester data only");
    expect(container.textContent).not.toContain("Select OC");
    expect(container.textContent).not.toContain("Name of the OC");

    changeField(container.querySelector("#excludedReason") as HTMLTextAreaElement, "Repeat with next course");
    act(() => {
      (container.querySelector('[data-slot="checkbox"]') as HTMLButtonElement).click();
    });

    await act(async () => {
      getButton(container, "Confirm repeat-semester relegation").click();
    });

    expect(mockRelegationApi.applyTransfer).toHaveBeenCalledWith({
      ocId: "11111111-1111-4111-8111-111111111111",
      toCourseId: "course-2",
      relegationMode: "REPEAT_SEMESTER",
      targetSemester: 1,
      reason: "Repeat with next course",
      remark: null,
      pdfObjectKey: null,
      pdfUrl: null,
    });
  });
});
