import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/components/medical/MedicalRecordsPageClient", () => ({
  default: ({ ocId }: { ocId: string }) => ({ type: "medical-records-client", props: { ocId } }),
}));

import { redirect } from "next/navigation";
import MedicalRecordsPage from "@/app/dashboard/[id]/milmgmt/med-record/page";

describe("med-record page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("canonicalizes legacy semester query params on the server", async () => {
    await expect(
      MedicalRecordsPage({
        params: Promise.resolve({ id: "oc-123" }),
        searchParams: Promise.resolve({ sem: "4", tab: "basic-details" }),
      })
    ).rejects.toThrow(
      "REDIRECT:/dashboard/oc-123/milmgmt/med-record?tab=basic-details&semester=4"
    );

    expect(redirect).toHaveBeenCalledWith(
      "/dashboard/oc-123/milmgmt/med-record?tab=basic-details&semester=4"
    );
  });

  it("renders the client page when the query is already canonical", async () => {
    const element = await MedicalRecordsPage({
      params: Promise.resolve({ id: "oc-123" }),
      searchParams: Promise.resolve({ semester: "4" }),
    });

    expect(element).toBeTruthy();
  });
});
