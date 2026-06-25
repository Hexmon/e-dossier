// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

const mockGetAllCoursesPaged = vi.hoisted(() => vi.fn());
const mockGetAppointments = vi.hoisted(() => vi.fn());
const mockListSsbUploadOcs = vi.hoisted(() => vi.fn());
const mockUploadSsbPdf = vi.hoisted(() => vi.fn());
const mockGetSsbUploadVisibilitySettings = vi.hoisted(() => vi.fn());
const mockSaveSsbUploadVisibilitySettings = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/app/lib/api/courseApi", () => ({
  getAllCoursesPaged: mockGetAllCoursesPaged,
}));

vi.mock("@/app/lib/api/appointmentApi", () => ({
  getAppointments: mockGetAppointments,
}));

vi.mock("@/app/lib/api/ssbUploadApi", () => ({
  getSsbUploadVisibilitySettings: mockGetSsbUploadVisibilitySettings,
  listSsbUploadOcs: mockListSsbUploadOcs,
  saveSsbUploadVisibilitySettings: mockSaveSsbUploadVisibilitySettings,
  uploadSsbPdf: mockUploadSsbPdf,
}));

vi.mock("@/app/lib/apiClient", () => ({
  getFriendlyApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));

vi.mock("@/config/app.config", () => ({
  ocTabs: [{ value: "ssb-upload", title: "SSB Upload" }],
}));

vi.mock("@/components/layout/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/layout/BreadcrumbNav", () => ({
  default: () => <nav />,
}));

vi.mock("@/components/Tabs/GlobalTabs", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/tabs", () => ({
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/reports/common/PasswordField", () => ({
  PasswordField: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <input
      placeholder="Enter password"
      type="password"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onInput={(event) => onChange(event.currentTarget.value)}
    />
  ),
}));

vi.mock("@/components/ui/dialog", async () => {
  const React = await import("react");
  const Part = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

  return {
    Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
      open ? <div role="dialog">{children}</div> : null,
    DialogContent: Part,
    DialogDescription: Part,
    DialogFooter: Part,
    DialogHeader: Part,
    DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  };
});

vi.mock("@/components/ui/select", async () => {
  const React = await import("react");
  const SelectContext = React.createContext<{ onValueChange?: (value: string) => void }>({});

  return {
    Select: ({
      children,
      onValueChange,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
      value?: string;
    }) => (
      <SelectContext.Provider value={{ onValueChange }}>
        <div>{children}</div>
      </SelectContext.Provider>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => {
      const context = React.useContext(SelectContext);
      return (
        <button type="button" onClick={() => context.onValueChange?.(value)}>
          {children}
        </button>
      );
    },
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  };
});

import SsbUploadPage from "@/app/dashboard/genmgmt/ssb-upload/page";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("SsbUploadPage saved password visibility", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllCoursesPaged.mockResolvedValue({
      items: [{ id: "course-1", code: "Course-100", title: "Course Course-100" }],
    });
    mockGetAppointments.mockResolvedValue([{
      id: "appointment-1",
      userId: "user-1",
      username: "active.officer",
      positionId: "position-1",
      positionKey: "PL_CDR",
      positionName: "Platoon Commander",
      scopeType: "PLATOON",
      scopeId: "platoon-1",
      platoonKey: "ARJUN",
      platoonName: "Arjun",
      startsAt: "2026-01-01T00:00:00.000Z",
      endsAt: null,
      reason: "",
      deletedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }]);
    mockGetSsbUploadVisibilitySettings.mockResolvedValue({
      courseWindow: {
        courseStartDate: "2026-01-01",
        courseEndDate: "2026-06-14",
        defaultVisibleUntil: "2026-06-15",
      },
      settings: [{
        id: "setting-1",
        courseId: "course-1",
        positionId: "position-1",
        positionKey: "PL_CDR",
        positionName: "Platoon Commander",
        hiddenDays: 10,
        visibleUntil: "2026-06-20",
      }],
    });
    mockSaveSsbUploadVisibilitySettings.mockResolvedValue({
      courseWindow: {
        courseStartDate: "2026-01-01",
        courseEndDate: "2026-06-14",
        defaultVisibleUntil: "2026-06-15",
      },
      settings: [],
    });
    mockListSsbUploadOcs.mockResolvedValue({
      items: [{
        ocId: "oc-1",
        ocNo: "OC-0001",
        name: "Pratik",
        hasUpload: true,
        fileName: "ssb.pdf",
        savedPassword: "report-pass",
      }],
    });
    mockUploadSsbPdf.mockResolvedValue({
      item: {
        ocId: "oc-1",
        ocNo: "OC-0001",
        name: "Pratik",
        fileName: "ssb.pdf",
        hasUpload: true,
      },
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

  it("shows an eye button beside upload to reveal the saved password for an OC", async () => {
    await act(async () => {
      root.render(<SsbUploadPage />);
    });
    await flush();

    click(buttonContaining("Course-100"));
    await flush();

    click(buttonContaining("Edit"));

    const showButton = container.querySelector(
      'button[aria-label="Show saved SSB password for OC-0001"]'
    ) as HTMLButtonElement;

    expect(showButton).toBeTruthy();
    expect(showButton.className).toContain("hover:text-primary");
    expect(container.textContent).not.toContain("report-pass");

    click(showButton);

    expect(container.textContent).toContain("report-pass");
    expect(
      container.querySelector('button[aria-label="Hide saved SSB password for OC-0001"]')
    ).toBeTruthy();
  });

  it("shows current active appointments with DD/MM/YYYY dates in configure settings", async () => {
    await act(async () => {
      root.render(<SsbUploadPage />);
    });
    await flush();

    click(buttonContaining("Course-100"));
    await flush();
    click(buttonContaining("Configure Settings"));

    expect(mockGetAppointments).toHaveBeenCalledWith({ active: true, includeFuture: false });
    expect(container.textContent).toContain("Platoon Commander - Arjun");
    expect(container.textContent).toContain("active.officer");
    expect(container.textContent).toContain("01/01/2026");
    expect(container.textContent).toContain("14/06/2026");
    expect(container.textContent).toContain("20/06/2026");
  });

  function buttonContaining(text: string) {
    const button = Array.from(container.querySelectorAll("button")).find((item) =>
      item.textContent?.includes(text)
    );
    expect(button, `button containing ${text}`).toBeTruthy();
    return button as HTMLButtonElement;
  }
});

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function click(button: HTMLButtonElement) {
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}
