import type { NextRequest } from "next/server";

export const DEVICE_ID_STORAGE_KEY = "e_dossier_device_id";
export const DEVICE_ID_COOKIE_KEY = "ed_device_id";
export const DEVICE_ID_HEADER = "x-device-id";

const DEVICE_ID_PATTERN = /^[a-zA-Z0-9._:-]{8,128}$/;

export function normalizeDeviceId(value: string | null | undefined): string | null {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  return DEVICE_ID_PATTERN.test(normalized) ? normalized : null;
}

function fallbackDeviceId(): string {
  const random = Math.random().toString(36).slice(2, 12);
  return `device-${Date.now()}-${random}`;
}

export function getOrCreateDeviceIdClient(): string {
  if (typeof window === "undefined") return "";

  const existing = normalizeDeviceId(window.localStorage.getItem(DEVICE_ID_STORAGE_KEY));
  if (existing) {
    return existing;
  }

  const generated =
    typeof window.crypto?.randomUUID === "function" ? window.crypto.randomUUID() : fallbackDeviceId();

  window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, generated);
  return generated;
}

export function setDeviceIdCookie(deviceId: string) {
  if (typeof document === "undefined") return;
  const normalized = normalizeDeviceId(deviceId);
  if (!normalized) return;

  document.cookie = `${DEVICE_ID_COOKIE_KEY}=${encodeURIComponent(
    normalized
  )}; path=/; max-age=31536000; SameSite=Lax`;
}

export function resolveDeviceIdFromRequest(req: NextRequest): string | null {
  const fromHeader = normalizeDeviceId(req.headers.get(DEVICE_ID_HEADER));
  if (fromHeader) {
    return fromHeader;
  }

  const fromCookie = normalizeDeviceId(req.cookies.get(DEVICE_ID_COOKIE_KEY)?.value);
  return fromCookie;
}
