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

  beforeEach(() => {
    vi.resetModules();
    fetchMock = vi.fn();
    sessionStorageMock = createSessionStorageMock();
    assignMock = vi.fn();

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
    fetchMock
      .mockResolvedValueOnce(unauthorizedResponse())
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const { apiRequest } = await import("@/app/lib/apiClient");

    await expect(
      apiRequest({
        method: "GET",
        endpoint: "/api/v1/me",
      })
    ).rejects.toMatchObject({ status: 401 });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
      "ed_return_url",
      "/dashboard/reports?tab=1"
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/v1/auth/logout");
    expect(assignMock).toHaveBeenCalledWith("/login?next=%2Fdashboard%2Freports%3Ftab%3D1");
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

    await new Promise((resolve) => setTimeout(resolve, 0));

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

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(sessionStorageMock.setItem).not.toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("prevents duplicate redirect/logout flow after the first 401", async () => {
    fetchMock
      .mockResolvedValueOnce(unauthorizedResponse())
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(unauthorizedResponse());

    const { apiRequest } = await import("@/app/lib/apiClient");

    await expect(
      apiRequest({
        method: "GET",
        endpoint: "/api/v1/me",
      })
    ).rejects.toMatchObject({ status: 401 });

    await new Promise((resolve) => setTimeout(resolve, 0));

    await expect(
      apiRequest({
        method: "GET",
        endpoint: "/api/v1/me",
      })
    ).rejects.toMatchObject({ status: 401 });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(assignMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
