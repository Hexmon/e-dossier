import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

function unauthorizedResponse() {
  return new Response(null, { status: 401 });
}

describe("apiClient 401 handling", () => {
  const originalWindow = (globalThis as any).window;
  const originalFetch = globalThis.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;
  let sessionStorageMock: SessionStorageMock;
  let assignMock: ReturnType<typeof vi.fn>;
  let logoutAndRedirectMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    fetchMock = vi.fn();
    sessionStorageMock = createSessionStorageMock();
    assignMock = vi.fn();
    logoutAndRedirectMock = vi.fn().mockResolvedValue(undefined);

    vi.doMock("@/lib/auth/logout", () => ({
      logoutAndRedirect: logoutAndRedirectMock,
    }));

    (globalThis as any).fetch = fetchMock;
    (globalThis as any).window = {
      location: {
        origin: "http://localhost:3000",
        pathname: "/dashboard/reports",
        search: "?tab=1",
        assign: assignMock,
      },
      sessionStorage: sessionStorageMock,
    };
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
    (globalThis as any).fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("stores returnUrl and redirects to /login?next after eligible 401", async () => {
    fetchMock.mockResolvedValueOnce(unauthorizedResponse());

    const { apiRequest } = await import("@/app/lib/apiClient");

    await expect(
      apiRequest({
        method: "GET",
        endpoint: "/api/v1/me",
      })
    ).rejects.toMatchObject({ status: 401 });

    await vi.dynamicImportSettled();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(logoutAndRedirectMock).toHaveBeenCalledWith({
      reason: "unauthorized",
      preserveNext: true,
      showServerErrorToast: false,
    });
    expect(sessionStorageMock.setItem).not.toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
  });

  it("does not trigger redirect flow for login endpoint 401", async () => {
    fetchMock.mockResolvedValueOnce(unauthorizedResponse());
    const { apiRequest } = await import("@/app/lib/apiClient");

    await expect(
      apiRequest({
        method: "POST",
        endpoint: "/api/v1/auth/login",
        body: { username: "u", password: "p" },
        skipCsrf: true,
      })
    ).rejects.toMatchObject({ status: 401 });

    await vi.dynamicImportSettled();

    expect(sessionStorageMock.setItem).not.toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not trigger redirect flow when skipAuth is true", async () => {
    fetchMock.mockResolvedValueOnce(unauthorizedResponse());
    const { apiRequest } = await import("@/app/lib/apiClient");

    await expect(
      apiRequest({
        method: "GET",
        endpoint: "/api/v1/me/device-site-settings",
        skipAuth: true,
      })
    ).rejects.toMatchObject({ status: 401 });

    await vi.dynamicImportSettled();

    expect(sessionStorageMock.setItem).not.toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("continues to reject repeated eligible 401 responses while triggering logout handling", async () => {
    fetchMock
      .mockResolvedValueOnce(unauthorizedResponse())
      .mockResolvedValueOnce(unauthorizedResponse());

    const { apiRequest } = await import("@/app/lib/apiClient");

    await expect(
      apiRequest({
        method: "GET",
        endpoint: "/api/v1/me",
      })
    ).rejects.toMatchObject({ status: 401 });

    await vi.dynamicImportSettled();

    await expect(
      apiRequest({
        method: "GET",
        endpoint: "/api/v1/me",
      })
    ).rejects.toMatchObject({ status: 401 });

    await vi.dynamicImportSettled();

    expect(logoutAndRedirectMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
