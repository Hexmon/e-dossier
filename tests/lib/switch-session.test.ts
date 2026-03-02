import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  beginSwitchSession,
  endSwitchSession,
  isSwitchSessionInProgress,
} from "@/lib/auth/switch-session";

describe("switch-session guard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    endSwitchSession();
  });

  afterEach(() => {
    endSwitchSession();
    vi.useRealTimers();
  });

  it("toggles active state with begin/end", () => {
    expect(isSwitchSessionInProgress()).toBe(false);

    beginSwitchSession();
    expect(isSwitchSessionInProgress()).toBe(true);

    endSwitchSession();
    expect(isSwitchSessionInProgress()).toBe(false);
  });

  it("auto-expires after ttl", () => {
    beginSwitchSession();
    expect(isSwitchSessionInProgress()).toBe(true);

    vi.advanceTimersByTime(30_001);
    expect(isSwitchSessionInProgress()).toBe(false);
  });
});

