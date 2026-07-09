// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

const mockGetSsbUploadForOc = vi.hoisted(() => vi.fn());
const mockFetchOCById = vi.hoisted(() => vi.fn());
const mockFetchCourseById = vi.hoisted(() => vi.fn());
const mockFetchReport = vi.hoisted(() => vi.fn());
const mockSaveReport = vi.hoisted(() => vi.fn());
const mockUseMe = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "57f11017-0a6c-4fa6-960a-43e8a24b673b" }),
}));

vi.mock("react-redux", () => ({
  useDispatch: () => vi.fn(),
  useSelector: () => undefined,
}));

vi.mock("@/hooks/useMe", () => ({
  useMe: mockUseMe,
}));

vi.mock("@/hooks/useSsbReport", () => ({
  useSsbReport: () => ({
    report: null,
    fetch: mockFetchReport,
    save: mockSaveReport,
  }),
}));

vi.mock("@/app/lib/api/ocApi", () => ({
  fetchOCById: mockFetchOCById,
}));

vi.mock("@/app/lib/api/courseApi", () => ({
  fetchCourseById: mockFetchCourseById,
}));

vi.mock("@/app/lib/api/ssbUploadApi", () => ({
  getSsbUploadForOc: mockGetSsbUploadForOc,
  openSsbPdf: vi.fn(),
}));

vi.mock("@/components/layout/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/layout/BreadcrumbNav", () => ({
  default: () => <nav />,
}));

vi.mock("@/components/cadet_table/SelectedCadetTable", () => ({
  default: () => <div>Selected Cadet</div>,
}));

vi.mock("@/components/ssb/SSBReportForm", () => ({
  cloneSsbFormData: (data: unknown) => data,
  SSBReportForm: ({ hasUploadedPdf }: { hasUploadedPdf?: boolean }) => (
    <div>{hasUploadedPdf ? <button type="button">View Uploaded PDF</button> : null}</div>
  ),
}));

vi.mock("@/components/reports/common/PasswordField", () => ({
  PasswordField: () => <input type="password" />,
}));

vi.mock("@/components/ui/dialog", () => {
  const Part = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return {
    Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogContent: Part,
    DialogDescription: Part,
    DialogFooter: Part,
    DialogHeader: Part,
    DialogTitle: Part,
  };
});

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

vi.mock("@/config/app.config", () => ({
  reverseRatingMap: {},
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

import SsbReportsPage from "@/app/dashboard/[id]/milmgmt/ssb-reports/page";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("SsbReportsPage uploaded PDF visibility", () => {
  let container: HTMLDivElement;
  let root: Root;
  let meData: unknown;

  beforeEach(() => {
    vi.clearAllMocks();
    meData = {
      user: { id: "user-1" },
      apt: { id: "apt-1", position: "PL_CDR", delegation_id: null },
      authority: { delegationId: null },
    };
    mockUseMe.mockImplementation(() => ({ data: meData }));
    mockFetchReport.mockResolvedValue(undefined);
    mockSaveReport.mockResolvedValue(true);
    mockFetchOCById.mockResolvedValue({
      id: "57f11017-0a6c-4fa6-960a-43e8a24b673b",
      name: "OC MADHAVENDRA PRATAP SINGH",
      ocNo: "753",
      course: { id: "course-1" },
      currentSemester: 2,
    });
    mockFetchCourseById.mockResolvedValue({ course: { code: "TES-51" } });
    mockGetSsbUploadForOc
      .mockResolvedValueOnce({ item: { hasUpload: true, visibility: { canView: false } } })
      .mockResolvedValueOnce({ item: { hasUpload: true, visibility: { canView: true } } });

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

  it("reruns uploaded PDF visibility when the active appointment changes on the same OC page", async () => {
    await act(async () => {
      root.render(<SsbReportsPage />);
    });
    await flush();

    expect(mockGetSsbUploadForOc).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toContain("View Uploaded PDF");

    meData = {
      user: { id: "user-2" },
      apt: { id: "apt-2", position: "COMDT", delegation_id: null },
      authority: { delegationId: null },
    };

    await act(async () => {
      root.render(<SsbReportsPage />);
    });
    await flush();

    expect(mockGetSsbUploadForOc).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain("View Uploaded PDF");
  });
});

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}
