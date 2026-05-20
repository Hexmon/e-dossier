// @vitest-environment jsdom

import React, { useEffect, useState } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCourseApi = vi.hoisted(() => ({
  getAllCourses: vi.fn(),
  createCourse: vi.fn(),
  updateCourse: vi.fn(),
  deleteCourse: vi.fn(),
}));

vi.mock("@/app/lib/api/courseApi", () => mockCourseApi);

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/app/lib/apiClient", () => ({
  getFriendlyApiErrorMessage: vi.fn((_error: unknown, fallback: string) => fallback),
}));

import { useCourses } from "@/hooks/useCourses";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

describe("useCourses", () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = createTestQueryClient();
    mockCourseApi.getAllCourses.mockResolvedValue({
      items: [],
      count: 0,
      total: 0,
      limit: 100,
      offset: 0,
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    queryClient.clear();
    container.remove();
    vi.clearAllMocks();
  });

  it("keeps fetchCourses stable across rerenders", async () => {
    const seenFetchers: Array<() => Promise<unknown>> = [];

    function Probe() {
      const [renderTick, setRenderTick] = useState(0);
      const { fetchCourses } = useCourses();
      seenFetchers.push(fetchCourses);

      useEffect(() => {
        if (renderTick === 0) {
          setRenderTick(1);
        }
      }, [renderTick]);

      return <span>{renderTick}</span>;
    }

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <Probe />
        </QueryClientProvider>
      );
      await Promise.resolve();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(seenFetchers.length).toBeGreaterThanOrEqual(2);
    expect(seenFetchers.every((fetcher) => fetcher === seenFetchers[0])).toBe(true);
  });
});
