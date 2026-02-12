import { describe, expect, it } from "vitest";

import { reorderItemsByDrag } from "@/hooks/useAdminSiteSettings";

type Item = {
  id: string;
  sortOrder: number;
};

describe("reorderItemsByDrag", () => {
  it("moves source item before destination and recalculates sort order", () => {
    const items: Item[] = [
      { id: "a", sortOrder: 1 },
      { id: "b", sortOrder: 2 },
      { id: "c", sortOrder: 3 },
    ];

    const result = reorderItemsByDrag(items, "c", "a");

    expect(result.map((item) => item.id)).toEqual(["c", "a", "b"]);
    expect(result.map((item) => item.sortOrder)).toEqual([1, 2, 3]);
  });

  it("returns original when source and destination are same", () => {
    const items: Item[] = [
      { id: "a", sortOrder: 1 },
      { id: "b", sortOrder: 2 },
    ];

    const result = reorderItemsByDrag(items, "a", "a");

    expect(result).toEqual(items);
  });

  it("returns original when ids are invalid", () => {
    const items: Item[] = [
      { id: "a", sortOrder: 1 },
      { id: "b", sortOrder: 2 },
    ];

    const result = reorderItemsByDrag(items, "x", "b");
    expect(result).toEqual(items);
  });
});
