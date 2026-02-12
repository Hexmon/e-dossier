import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RETURN_URL_SESSION_KEY,
  buildLoginUrlWithNext,
  clearReturnUrl,
  readReturnUrl,
  resolvePostAuthRedirect,
  sanitizeReturnUrl,
  storeReturnUrl,
} from "@/lib/auth-return-url";

type SessionStorageMock = {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
};

function createSessionStorageMock(): SessionStorageMock {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => (key in store ? store[key] : null)),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
}

describe("auth return url helpers", () => {
  const originalWindow = (globalThis as any).window;
  let sessionStorageMock: SessionStorageMock;

  beforeEach(() => {
    sessionStorageMock = createSessionStorageMock();
    (globalThis as any).window = {
      location: {
        origin: "http://localhost:3000",
        pathname: "/dashboard/reports",
        search: "?x=1",
      },
      sessionStorage: sessionStorageMock,
    };
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
    vi.clearAllMocks();
  });

  it("sanitizes and allows dashboard paths only", () => {
    expect(sanitizeReturnUrl("/dashboard")).toBe("/dashboard");
    expect(sanitizeReturnUrl("/dashboard/reports?x=1")).toBe("/dashboard/reports?x=1");
    expect(sanitizeReturnUrl("https://evil.com")).toBeNull();
    expect(sanitizeReturnUrl("//evil.com")).toBeNull();
    expect(sanitizeReturnUrl("/api/v1/me")).toBeNull();
    expect(sanitizeReturnUrl("/login")).toBeNull();
  });

  it("stores, reads, and clears return url from sessionStorage", () => {
    storeReturnUrl("/dashboard/reports?tab=term1");
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
      RETURN_URL_SESSION_KEY,
      "/dashboard/reports?tab=term1"
    );
    expect(readReturnUrl()).toBe("/dashboard/reports?tab=term1");

    clearReturnUrl();
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(RETURN_URL_SESSION_KEY);
    expect(readReturnUrl()).toBeNull();
  });

  it("resolves redirect precedence: next > stored > fallback", () => {
    storeReturnUrl("/dashboard/reports?tab=stored");

    expect(
      resolvePostAuthRedirect({
        nextParam: "/dashboard/genmgmt?source=next",
        storedReturnUrl: readReturnUrl(),
      })
    ).toBe("/dashboard/genmgmt?source=next");

    expect(
      resolvePostAuthRedirect({
        nextParam: "https://evil.com",
        storedReturnUrl: readReturnUrl(),
      })
    ).toBe("/dashboard/reports?tab=stored");

    clearReturnUrl();
    expect(
      resolvePostAuthRedirect({
        nextParam: null,
        storedReturnUrl: null,
      })
    ).toBe("/dashboard");
  });

  it("builds login url with safe next only", () => {
    expect(buildLoginUrlWithNext("/dashboard/reports?x=1")).toBe(
      "/login?next=%2Fdashboard%2Freports%3Fx%3D1"
    );
    expect(buildLoginUrlWithNext("https://evil.com")).toBe("/login");
  });
});
