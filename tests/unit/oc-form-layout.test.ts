import { describe, expect, it } from "vitest";

import {
  OC_FORM_BODY_CLASS,
  OC_FORM_DIALOG_CONTENT_CLASS,
  OC_FORM_SECTION_GRID_CLASS,
} from "@/components/genmgmt/OCForm";

describe("OC form layout", () => {
  it("keeps the add/edit OC dialog wide instead of the default narrow dialog width", () => {
    expect(OC_FORM_DIALOG_CONTENT_CLASS).toContain("w-[96vw]");
    expect(OC_FORM_DIALOG_CONTENT_CLASS).toContain("sm:!max-w-[96vw]");
    expect(OC_FORM_DIALOG_CONTENT_CLASS).toContain("lg:!max-w-[1280px]");
    expect(OC_FORM_DIALOG_CONTENT_CLASS).toContain("xl:!max-w-[1500px]");
    expect(OC_FORM_DIALOG_CONTENT_CLASS).toContain("max-h-[92vh]");
    expect(OC_FORM_DIALOG_CONTENT_CLASS).toContain("overflow-hidden");
    expect(OC_FORM_DIALOG_CONTENT_CLASS).toContain("flex");
    expect(OC_FORM_BODY_CLASS).toContain("overflow-y-auto");
    expect(OC_FORM_BODY_CLASS).toContain("bg-muted/20");
    expect(OC_FORM_SECTION_GRID_CLASS).toContain("grid-cols-1");
    expect(OC_FORM_SECTION_GRID_CLASS).toContain("md:grid-cols-2");
    expect(OC_FORM_SECTION_GRID_CLASS).toContain("xl:grid-cols-3");
  });
});
