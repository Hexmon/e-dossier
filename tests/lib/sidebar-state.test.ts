import { describe, expect, it, vi, afterEach } from "vitest";
import {
  readSidebarOpenPreference,
  writeSidebarOpenPreference,
  SIDEBAR_OPEN_STORAGE_KEY,
} from "@/lib/ui/sidebar-state";

function createMockStorage(initial: Record<string, string> = {}) {
  const data = new Map<string, string>(Object.entries(initial));

  return {
    getItem: vi.fn((key: string) => (data.has(key) ? data.get(key)! : null)),
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      data.delete(key);
    }),
  };
}

describe("sidebar state persistence", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when no saved preference exists", () => {
    const localStorage = createMockStorage();
    vi.stubGlobal("window", { localStorage });

    expect(readSidebarOpenPreference()).toBeNull();
  });

  it("parses 1/0 and true/false persisted values", () => {
    vi.stubGlobal("window", {
      localStorage: createMockStorage({ [SIDEBAR_OPEN_STORAGE_KEY]: "1" }),
    });
    expect(readSidebarOpenPreference()).toBe(true);

    vi.stubGlobal("window", {
      localStorage: createMockStorage({ [SIDEBAR_OPEN_STORAGE_KEY]: "0" }),
    });
    expect(readSidebarOpenPreference()).toBe(false);

    vi.stubGlobal("window", {
      localStorage: createMockStorage({ [SIDEBAR_OPEN_STORAGE_KEY]: "true" }),
    });
    expect(readSidebarOpenPreference()).toBe(true);

    vi.stubGlobal("window", {
      localStorage: createMockStorage({ [SIDEBAR_OPEN_STORAGE_KEY]: "false" }),
    });
    expect(readSidebarOpenPreference()).toBe(false);
  });

  it("returns null for invalid stored value", () => {
    vi.stubGlobal("window", {
      localStorage: createMockStorage({ [SIDEBAR_OPEN_STORAGE_KEY]: "maybe" }),
    });

    expect(readSidebarOpenPreference()).toBeNull();
  });

  it("writes serialized preference to storage", () => {
    const localStorage = createMockStorage();
    vi.stubGlobal("window", { localStorage });

    writeSidebarOpenPreference(true);
    expect(localStorage.setItem).toHaveBeenCalledWith(SIDEBAR_OPEN_STORAGE_KEY, "1");

    writeSidebarOpenPreference(false);
    expect(localStorage.setItem).toHaveBeenCalledWith(SIDEBAR_OPEN_STORAGE_KEY, "0");
  });

  it("does not throw without browser window", () => {
    vi.stubGlobal("window", undefined);

    expect(readSidebarOpenPreference()).toBeNull();
    expect(() => writeSidebarOpenPreference(true)).not.toThrow();
  });
});
