import { describe, expect, it } from "vitest";

import { buildOcModalQueryParams, resolveOcModalScope } from "@/lib/oc-modal-scope";

describe("resolveOcModalScope", () => {
  it("marks platoon scope and returns platoon id", () => {
    const result = resolveOcModalScope({
      scope: {
        type: "PLATOON",
        id: "11111111-1111-4111-8111-111111111111",
      },
    });

    expect(result.isPlatoonScoped).toBe(true);
    expect(result.platoonId).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("returns non-scoped result for global scope", () => {
    const result = resolveOcModalScope({
      scope: {
        type: "GLOBAL",
        id: null,
      },
    });

    expect(result.isPlatoonScoped).toBe(false);
    expect(result.platoonId).toBeNull();
  });
});

describe("buildOcModalQueryParams", () => {
  it("builds active query with trimmed search and defaults", () => {
    const result = buildOcModalQueryParams({
      platoonId: "platoon-id",
      query: "  rahul ",
      sort: "updated_desc",
    });

    expect(result).toEqual({
      active: true,
      limit: 20,
      platoon: "platoon-id",
      query: "rahul",
      sort: "updated_desc",
    });
  });

  it("clamps limit to max 100", () => {
    const result = buildOcModalQueryParams({
      query: "",
      limit: 1000,
    });

    expect(result.limit).toBe(100);
    expect(result.query).toBeUndefined();
    expect(result.sort).toBe("name_asc");
    expect(result.active).toBe(true);
  });
});
