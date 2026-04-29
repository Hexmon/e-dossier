import { describe, expect, it } from "vitest";

import {
  findReusablePosition,
  normalizePositionKey,
} from "@/lib/appointments/position-reuse";

const positions = [
  {
    id: "position-1",
    key: "admin-officer",
    displayName: "Admin Officer",
    defaultScope: "GLOBAL" as const,
  },
  {
    id: "position-2",
    key: "platoon-commander",
    displayName: "Platoon Commander",
    defaultScope: "PLATOON" as const,
  },
];

describe("position reuse helpers", () => {
  it("normalizes appointment names into stable position keys", () => {
    expect(normalizePositionKey("  Admin Officer  ")).toBe("admin-officer");
    expect(normalizePositionKey("Training Officer (A)")).toBe("training-officer-a");
  });

  it("reuses an existing position by normalized key", () => {
    const result = findReusablePosition(positions, "Admin Officer");
    expect(result?.id).toBe("position-1");
  });

  it("reuses an existing position by display name case-insensitively", () => {
    const result = findReusablePosition(
      [
        {
          id: "position-3",
          key: "custom-key",
          displayName: "Deputy Commander",
          defaultScope: "GLOBAL" as const,
        },
      ],
      "deputy commander",
    );

    expect(result?.id).toBe("position-3");
  });

  it("returns null when no reusable position exists", () => {
    expect(findReusablePosition(positions, "Quartermaster")).toBeNull();
  });
});
