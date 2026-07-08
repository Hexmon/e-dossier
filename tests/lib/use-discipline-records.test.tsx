// @vitest-environment jsdom

import React, { useEffect, useState } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const disciplineApiMock = vi.hoisted(() => ({
  getDisciplineRecords: vi.fn(),
  saveDisciplineRecords: vi.fn(),
  updateDisciplineRecord: vi.fn(),
  deleteDisciplineRecord: vi.fn(),
}));

vi.mock("@/app/lib/api/disciplineApi", () => disciplineApiMock);

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { useDisciplineRecords } from "@/hooks/useDisciplineRecords";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

describe("useDisciplineRecords", () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = createTestQueryClient();
    disciplineApiMock.getDisciplineRecords.mockResolvedValue([
      {
        id: "disc-1",
        semester: 1,
        dateOfOffence: "2026-06-09",
        offence: "Behaviour",
        punishmentAwarded: "Extra PT",
        numberOfPunishments: 1,
        awardedOn: "2026-06-09",
        awardedBy: "Pratik Mahapatra",
        pointsDelta: 5,
        pointsCumulative: 5,
      },
    ]);
    disciplineApiMock.saveDisciplineRecords.mockResolvedValue({ ok: true, result: [], payloads: [] });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    queryClient.clear();
    container.remove();
    vi.clearAllMocks();
  });

  it("stores new discipline cumulative as previous persisted points plus current points", async () => {
    function Probe() {
      const [submitted, setSubmitted] = useState(false);
      const { groupedBySemester, saveRecords } = useDisciplineRecords("oc-1", 6);

      useEffect(() => {
        if (submitted || groupedBySemester[0].length === 0) return;
        setSubmitted(true);
        void saveRecords(1, [
          {
            serialNo: "",
            dateOfOffence: "2026-06-10",
            offence: "Late",
            punishmentAwarded: "Extra PT",
            punishmentId: "",
            numberOfPunishments: "1",
            dateOfAward: "2026-06-10",
            byWhomAwarded: "Pratik Mahapatra",
            negativePts: "5",
            cumulative: "5.00",
          },
        ]);
      }, [groupedBySemester, saveRecords, submitted]);

      return null;
    }

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <Probe />
        </QueryClientProvider>
      );
      await Promise.resolve();
    });

    for (let i = 0; i < 5; i += 1) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    expect(disciplineApiMock.saveDisciplineRecords).toHaveBeenCalledWith(
      "oc-1",
      expect.arrayContaining([
        expect.objectContaining({
          pointsDelta: 5,
          pointsCumulative: 10,
        }),
      ])
    );
  });
});
