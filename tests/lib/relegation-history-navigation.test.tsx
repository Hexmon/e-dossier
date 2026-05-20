// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot, type Root } from "react-dom/client";

const mockUseRelegationHistory = vi.hoisted(() => vi.fn());

vi.mock("@/app/lib/debounce", () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

vi.mock("@/hooks/useRelegation", () => ({
  useRelegationHistory: (params: unknown) => mockUseRelegationHistory(params),
}));

vi.mock("@/components/relegation/RelegationForm", () => ({
  default: () => <div data-testid="relegation-form">Relegation transfer form</div>,
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

import PromotionRelegationCards from "@/components/genmgmt/promotion-relegation/PromotionRelegationCards";
import RelegationHistoryTable from "@/components/genmgmt/promotion-relegation/RelegationHistoryTable";
import RelegationManagementCard from "@/components/genmgmt/promotion-relegation/RelegationManagementCard";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function getButton(container: HTMLElement, text: string) {
  const button = Array.from(container.querySelectorAll("button")).find((item) =>
    item.textContent?.includes(text)
  );
  expect(button, `button containing "${text}"`).toBeTruthy();
  return button as HTMLButtonElement;
}

describe("promotion/relegation history navigation", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRelegationHistory.mockReturnValue({
      data: {
        items: [],
        total: 0,
        limit: 25,
        offset: 0,
      },
      isLoading: false,
      isFetching: false,
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("adds a dedicated relegation history card on the landing page", () => {
    const html = renderToStaticMarkup(<PromotionRelegationCards />);

    expect(html).toContain("Relegation Management");
    expect(html).toContain("Relegation History");
    expect(html).toContain("Promote Course");
    expect(html).toContain("href=\"/dashboard/genmgmt/promotion-relegation/history\"");
  });

  it("keeps the relegation management card focused on the transfer form", () => {
    const html = renderToStaticMarkup(<RelegationManagementCard />);

    expect(html).toContain("Relegation transfer form");
    expect(html).not.toContain("Search and audit all promotion");
    expect(html).not.toContain("No relegation history found");
  });

  it("supports filtering relegation history by movement type", () => {
    act(() => {
      root.render(
        <RelegationHistoryTable
          courses={[
            { id: "course-1", code: "TES-50", title: "Course TES-50" },
            { id: "course-2", code: "TES-51", title: "Course TES-51" },
          ]}
          onViewPdf={vi.fn()}
          onViewEnrollments={vi.fn()}
          onVoidPromotion={vi.fn()}
        />
      );
    });

    expect(container.textContent).toContain("Movement Type");
    expect(mockUseRelegationHistory).toHaveBeenLastCalledWith({
      q: undefined,
      courseFromId: undefined,
      courseToId: undefined,
      movementKind: undefined,
      limit: 25,
      offset: 0,
    });

    click(getButton(container, "Repeat-semester relegation"));

    expect(mockUseRelegationHistory).toHaveBeenLastCalledWith({
      q: undefined,
      courseFromId: undefined,
      courseToId: undefined,
      movementKind: "SEMESTER_REPEAT",
      limit: 25,
      offset: 0,
    });
  });

  it("does not reset to page one while the next history page is loading", () => {
    mockUseRelegationHistory.mockImplementation((params: { offset?: number; limit?: number }) => {
      if ((params.offset ?? 0) > 0) {
        return {
          data: undefined,
          isLoading: false,
          isFetching: true,
        };
      }

      return {
        data: {
          items: [],
          total: 60,
          limit: params.limit ?? 25,
          offset: 0,
        },
        isLoading: false,
        isFetching: false,
      };
    });

    act(() => {
      root.render(
        <RelegationHistoryTable
          courses={[]}
          onViewPdf={vi.fn()}
          onViewEnrollments={vi.fn()}
          onVoidPromotion={vi.fn()}
        />
      );
    });

    expect(container.textContent).toContain("Page 1 / 3");

    click(getButton(container, "Next"));

    expect(mockUseRelegationHistory).toHaveBeenLastCalledWith({
      q: undefined,
      courseFromId: undefined,
      courseToId: undefined,
      movementKind: undefined,
      limit: 25,
      offset: 25,
    });
    expect(container.textContent).toContain("Page 2 / 3");
  });
});

function click(button: HTMLButtonElement) {
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}
