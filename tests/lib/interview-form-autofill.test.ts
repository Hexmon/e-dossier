import { describe, expect, it } from "vitest";

import {
  applyInterviewActorAutofill,
  applySpecialInterviewActorAutofill,
  buildInterviewActorDisplayName,
  createDefaultSpecialInterviewRecord,
  resolveTermActorAutofillFields,
} from "@/lib/interviewFormAutofill";

describe("interview form autofill", () => {
  it("builds a rank and name display string", () => {
    expect(buildInterviewActorDisplayName({ rank: "Capt", name: "A Kumar" })).toBe("Capt A Kumar");
    expect(buildInterviewActorDisplayName({ rank: "", name: "A Kumar" })).toBe("A Kumar");
  });

  it("fills empty interviewed-by and signature fields without overwriting existing values", () => {
    const values = applyInterviewActorAutofill({
      values: {
        interviewedBy: "",
        signatureBlock: undefined,
        existingSignature: "Maj Existing",
        remarks: "",
      },
      actorDisplayName: "Capt A Kumar",
      templateFields: [
        { key: "interviewedBy", label: "Interviewed By", fieldType: "text", groupId: null, captureSignature: false },
        { key: "signatureBlock", label: "Signature", fieldType: "signature", groupId: null, captureSignature: false },
        { key: "existingSignature", label: "Signed By", fieldType: "text", groupId: null, captureSignature: true },
        { key: "remarks", label: "Remarks", fieldType: "textarea", groupId: null, captureSignature: false },
      ],
    });

    expect(values.interviewedBy).toBe("Capt A Kumar");
    expect(values.signatureBlock).toBe("Capt A Kumar");
    expect(values.existingSignature).toBe("Maj Existing");
    expect(values.remarks).toBe("");
  });

  it("supports mapped field keys for term-prefixed forms", () => {
    const values = applyInterviewActorAutofill({
      values: {
        term1_postmid_interviewedBy: "",
      },
      actorDisplayName: "Capt A Kumar",
      templateFields: [
        { key: "interviewedBy", label: "Interviewed By", fieldType: "text", groupId: null, captureSignature: false },
      ],
      resolveFieldKey: (field) => `term1_postmid_${field.key}`,
    });

    expect(values.term1_postmid_interviewedBy).toBe("Capt A Kumar");
  });

  it("autofills only the PL CDR textarea for post-mid-term templates when present", () => {
    const fields = resolveTermActorAutofillFields(
      [
        { key: "strengths", label: "Strengths", fieldType: "textarea", groupId: null, captureSignature: false },
        { key: "weakness", label: "Weakness", fieldType: "textarea", groupId: null, captureSignature: false },
        { key: "plCdr", label: "PL Cdr", fieldType: "textarea", groupId: null, captureSignature: false },
        { key: "interviewedBy", label: "Interviewed By", fieldType: "text", groupId: null, captureSignature: false },
      ],
      "postmid",
    );

    expect(fields.map((field) => field.key)).toEqual(["plCdr"]);

    const values = applyInterviewActorAutofill({
      values: {
        term1_postmid_strengths: "Saved strengths",
        term1_postmid_weakness: "Saved weakness",
        term1_postmid_plCdr: "",
        term1_postmid_interviewedBy: "",
      },
      actorDisplayName: "Capt A Kumar",
      templateFields: fields,
      resolveFieldKey: (field) => `term1_postmid_${field.key}`,
    });

    expect(values.term1_postmid_strengths).toBe("Saved strengths");
    expect(values.term1_postmid_weakness).toBe("Saved weakness");
    expect(values.term1_postmid_plCdr).toBe("Capt A Kumar");
    expect(values.term1_postmid_interviewedBy).toBe("");
  });

  it("fills empty special interview interviewer names and seeds new rows", () => {
    const records = applySpecialInterviewActorAutofill(
      [
        { date: "", summary: "", interviewedBy: "" },
        { date: "", summary: "", interviewedBy: "Maj Existing" },
      ],
      "Capt A Kumar",
    );

    expect(records[0].interviewedBy).toBe("Capt A Kumar");
    expect(records[1].interviewedBy).toBe("Maj Existing");
    expect(createDefaultSpecialInterviewRecord(2, "Capt A Kumar")).toEqual({
      date: "",
      summary: "",
      interviewedBy: "Capt A Kumar",
      rowIndex: 2,
    });
  });
});
