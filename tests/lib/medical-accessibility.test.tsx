import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("react-redux", () => ({
  useDispatch: () => vi.fn(),
}));

import MedicalInfoFormComponent from "@/components/medical/MedicalInfoForm";
import MedicalInfoTable from "@/components/medical/MedicalInfoTable";
import MedicalCategoryForm from "@/components/medical/MedicalCategoryForm";
import MedicalCategoryTable from "@/components/medical/MedicalCategoryTable";

describe("medical accessibility", () => {
  it("renders accessible captions, labels, and descriptions in the medical info form", () => {
    const html = renderToStaticMarkup(
      <MedicalInfoFormComponent
        onSubmit={() => {}}
        disabled
        detailsEditing={false}
        canEditDetails={false}
        onDetailsEdit={() => {}}
        onDetailsCancel={() => {}}
        onDetailsSave={() => {}}
        defaultValues={{
          medInfo: [
            {
              date: "",
              age: "",
              height: "",
              ibw: "",
              abw: "",
              overw: "",
              bmi: "",
              chest: "",
            },
          ],
          medicalHistory: "",
          medicalIssues: "",
          allergies: "",
        }}
        ocId="oc-1"
        onClear={() => {}}
        readOnlyNoticeId="medical-lock medical-writer"
      />
    );

    expect(html).toContain("Medical information entry rows for the selected semester.");
    expect(html).toContain('aria-describedby="medical-lock medical-writer"');
    expect(html).toContain('scope="col"');
    expect(html).toContain('aria-label="Remove medical information row 1"');
    expect(html).toContain('for="medical-history"');
    expect(html).toContain('for="medical-issues"');
    expect(html).toContain('for="medical-allergies"');
  });

  it("renders medical tables with captions, descriptions, and row-context action labels", () => {
    const infoHtml = renderToStaticMarkup(
      <MedicalInfoTable
        rows={[
          {
            id: "info-1",
            term: "Semester 1",
            date: "2026-01-01",
            age: "20",
            height: "175",
            ibw: "60",
            abw: "61",
            overw: "0",
            bmi: "19.92",
            chest: "95",
            medicalHistory: "",
            medicalIssues: "",
            allergies: "",
          },
        ]}
        semesters={["Semester 1"]}
        activeTab={0}
        loading={false}
        editingId={null}
        editForm={null}
        describedBy="medical-lock medical-writer"
        onEdit={() => {}}
        onChange={() => {}}
        onSave={() => {}}
        onCancel={() => {}}
        onDelete={() => {}}
      />
    );

    expect(infoHtml).toContain("Medical information records for Semester 1.");
    expect(infoHtml).toContain('aria-describedby="medical-lock medical-writer"');
    expect(infoHtml).toContain('aria-label="Edit medical record dated 2026-01-01"');
    expect(infoHtml).toContain('aria-label="Delete medical record dated 2026-01-01"');

    const categoryHtml = renderToStaticMarkup(
      <MedicalCategoryTable
        rows={[
          {
            id: "cat-1",
            semester: 1,
            date: "2026-02-01",
            diagnosis: "Rest",
            catFrom: "2026-02-01",
            catTo: "2026-02-07",
            mhFrom: "",
            mhTo: "",
            absence: "0",
            piCdrInitial: "AB",
          },
        ]}
        editingId={null}
        editForm={null}
        describedBy="medical-category-lock"
        onEdit={() => {}}
        onChange={() => {}}
        onSave={() => {}}
        onCancel={() => {}}
        onDelete={() => {}}
      />
    );

    expect(categoryHtml).toContain("Medical category records for the selected semester.");
    expect(categoryHtml).toContain('aria-describedby="medical-category-lock"');
    expect(categoryHtml).toContain('aria-label="Edit medical category record dated 2026-02-01"');
    expect(categoryHtml).toContain('aria-label="Delete medical category record dated 2026-02-01"');
  });

  it("renders accessible captions and remove labels in the medical category form", () => {
    const html = renderToStaticMarkup(
      <MedicalCategoryForm
        onSubmit={() => {}}
        defaultValues={{
          records: [
            {
              date: "",
              diagnosis: "",
              catFrom: "",
              catTo: "",
              mhFrom: "",
              mhTo: "",
              absence: "",
              piCdrInitial: "",
            },
          ],
        }}
        ocId="oc-1"
        onClear={() => {}}
        readOnlyNoticeId="medical-category-lock medical-category-writer"
      />
    );

    expect(html).toContain("Medical category entry rows for the selected semester.");
    expect(html).toContain('aria-describedby="medical-category-lock medical-category-writer"');
    expect(html).toContain('scope="col"');
    expect(html).toContain('aria-label="Remove medical category row 1"');
  });
});
