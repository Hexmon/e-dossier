import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn((options) => options),
}));

import { useQuery } from "@tanstack/react-query";
import { useSetupStatus } from "@/hooks/useSetupStatus";

describe("useSetupStatus", () => {
  it("allows setup pages to force a fresh status fetch on return", () => {
    const initialData = {
      bootstrapRequired: false,
      setupComplete: false,
      nextStep: "platoons",
      counts: {},
      steps: {},
    } as any;

    useSetupStatus(initialData, {
      refetchOnMount: "always",
      refetchOnReconnect: "always",
      refetchOnWindowFocus: "always",
      staleTime: 0,
    });

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["setup-status"],
        initialData,
        refetchOnMount: "always",
        refetchOnReconnect: "always",
        refetchOnWindowFocus: "always",
        staleTime: 0,
      })
    );
  });
});
