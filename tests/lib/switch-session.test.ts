import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  beginSwitchSession,
  endSwitchSession,
  isSwitchSessionInProgress,
} from "@/lib/auth/switch-session";

// Assuming a default TTL of 30 seconds (30_000 ms) based on existing test
// In a real scenario, this constant should ideally be imported from the module itself
// or defined in a shared test utility if it's a configurable value.
const SWITCH_SESSION_TTL = 30_000; // milliseconds

describe("switch-session guard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Ensure a clean state before each test
    endSwitchSession();
  });

  afterEach(() => {
    // Clean up timers and session after each test
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

    vi.advanceTimersByTime(SWITCH_SESSION_TTL + 1); // 30_001 ms
    expect(isSwitchSessionInProgress()).toBe(false);
  });

  it("does not reset timer or state when beginSwitchSession is called multiple times", () => {
    expect(isSwitchSessionInProgress()).toBe(false);

    beginSwitchSession();
    expect(isSwitchSessionInProgress()).toBe(true);

    vi.advanceTimersByTime(SWITCH_SESSION_TTL / 2); // Advance halfway through the TTL
    expect(isSwitchSessionInProgress()).toBe(true); // Still active

    // Call beginSwitchSession again - should not reset the timer
    beginSwitchSession();
    expect(isSwitchSessionInProgress()).toBe(true); // Still active

    // Advance past the original TTL from the first call
    vi.advanceTimersByTime(SWITCH_SESSION_TTL / 2 + 1); // Total time advanced: (TTL/2) + (TTL/2 + 1) = TTL + 1
    expect(isSwitchSessionInProgress()).toBe(false); // Should have expired based on the first call
  });

  it("handles endSwitchSession gracefully when no session is in progress", () => {
    expect(isSwitchSessionInProgress()).toBe(false);

    // Call endSwitchSession when no session is active
    expect(() => endSwitchSession()).not.toThrow();
    expect(isSwitchSessionInProgress()).toBe(false); // State should remain false

    beginSwitchSession();
    expect(isSwitchSessionInProgress()).toBe(true);
    endSwitchSession(); // End an active session
    expect(isSwitchSessionInProgress()).toBe(false);

    // Call endSwitchSession again immediately after ending an active one
    expect(() => endSwitchSession()).not.toThrow();
    expect(isSwitchSessionInProgress()).toBe(false); // State should remain false
  });

  it("remains active exactly at TTL and expires immediately after", () => {
    beginSwitchSession();
    expect(isSwitchSessionInProgress()).toBe(true);

    // Advance exactly to the TTL boundary
    vi.advanceTimersByTime(SWITCH_SESSION_TTL);
    expect(isSwitchSessionInProgress()).toBe(true); // Should still be active at the exact TTL

    // Advance one more millisecond
    vi.advanceTimersByTime(1);
    expect(isSwitchSessionInProgress()).toBe(false); // Should expire immediately after TTL
  });
});
