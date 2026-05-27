import { describe, expect, it } from "vitest";
import { formatOdtMarks, resolveOdtChartScale } from "@/components/performance_graph/odtChartScale";

describe("ODT chart scale", () => {
  it("uses PT max marks for term denominators and a padded dynamic axis", () => {
    const scale = resolveOdtChartScale({
      data: [75, 150, 0, 0, 0, 0],
      averageData: [52.5, 120, 0, 0, 0, 0],
      maxMarks: [75, 150, 0, 0, 0, 0],
    });

    expect(scale.termMaxMarks).toEqual([75, 150, 0, 0, 0, 0]);
    expect(scale.axisMax).toBeGreaterThan(150);
    expect(formatOdtMarks(75, 0, scale.termMaxMarks, scale.axisMax)).toBe("75/75");
    expect(formatOdtMarks(150, 1, scale.termMaxMarks, scale.axisMax)).toBe("150/150");
  });
});
