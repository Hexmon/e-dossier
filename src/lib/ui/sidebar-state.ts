export const SIDEBAR_OPEN_STORAGE_KEY = "ui.sidebar.open";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readSidebarOpenPreference(): boolean | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const value = storage.getItem(SIDEBAR_OPEN_STORAGE_KEY);
    if (value === null) return null;

    if (value === "1" || value === "true") return true;
    if (value === "0" || value === "false") return false;

    return null;
  } catch {
    return null;
  }
}

export function writeSidebarOpenPreference(isOpen: boolean): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(SIDEBAR_OPEN_STORAGE_KEY, isOpen ? "1" : "0");
  } catch {
    // Best-effort persistence; UI state should still update in memory.
  }
}
