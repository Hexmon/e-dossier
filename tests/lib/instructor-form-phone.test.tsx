import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useSubjects", () => ({
  useSubjects: () => ({
    loading: false,
    subjects: [],
  }),
}));

import InstructorForm from "@/components/instructors/InstructorForm";

describe("InstructorForm phone input", () => {
  it("renders the shared India phone input in the add instructor form", () => {
    const html = renderToStaticMarkup(
      <InstructorForm onSubmit={vi.fn()} onCancel={vi.fn()} />
    );

    expect(html).toContain("+91");
    expect(html).toContain('id="phone"');
    expect(html).toContain('type="tel"');
    expect(html).toContain('inputMode="numeric"');
    expect(html).toContain('maxLength="10"');
    expect(html).toContain('minLength="10"');
    expect(html).toContain('pattern="[0-9]{10}"');
    expect(html).toContain('autoComplete="tel-national"');
    expect(html).not.toContain("+1-555-0102");
  });
});
