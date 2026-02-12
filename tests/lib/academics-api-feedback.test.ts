import { describe, expect, it } from "vitest";
import { ApiClientError } from "@/app/lib/apiClient";
import {
  extractRequestId,
  extractValidationIssues,
  resolveApiMessage,
} from "@/lib/api-feedback";

describe("api-feedback helpers", () => {
  it("prefers ApiClientError message", () => {
    const error = new ApiClientError("Backend says no", 400, "bad_request");
    expect(resolveApiMessage(error, "fallback")).toBe("Backend says no");
  });

  it("extracts validation issues from extras", () => {
    const error = new ApiClientError("Validation failed", 400, "bad_request", {
      issues: {
        formErrors: ["At least one field is required."],
        fieldErrors: {
          marksScored: ["Must be a number."],
        },
      },
    });

    const parsed = extractValidationIssues(error);
    expect(parsed.formErrors).toEqual(["At least one field is required."]);
    expect(parsed.fieldErrors.marksScored).toEqual(["Must be a number."]);
  });

  it("extracts request id from response header", () => {
    const response = new Response(null, {
      headers: { "x-request-id": "req-123" },
    });
    const error = new ApiClientError("Oops", 500, "server_error", undefined, response);
    expect(extractRequestId(error)).toBe("req-123");
  });

  it("falls back cleanly for unknown errors", () => {
    expect(resolveApiMessage({ nope: true }, "fallback")).toBe("fallback");
    expect(extractRequestId({ nope: true })).toBeNull();
    expect(extractValidationIssues({ nope: true })).toEqual({
      formErrors: [],
      fieldErrors: {},
    });
  });
});
