const SWITCH_SESSION_TTL_MS = 30_000;

let switchSessionInProgress = false;
let switchSessionStartedAt = 0;

function isExpired(now: number): boolean {
  if (!switchSessionInProgress) return false;
  return now - switchSessionStartedAt > SWITCH_SESSION_TTL_MS;
}

export function beginSwitchSession(): void {
  switchSessionInProgress = true;
  switchSessionStartedAt = Date.now();
}

export function endSwitchSession(): void {
  switchSessionInProgress = false;
  switchSessionStartedAt = 0;
}

export function isSwitchSessionInProgress(): boolean {
  const now = Date.now();
  if (isExpired(now)) {
    endSwitchSession();
    return false;
  }
  return switchSessionInProgress;
}

