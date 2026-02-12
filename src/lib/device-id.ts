import { getOrCreateDeviceIdClient } from "@/lib/device-context";

export function getOrCreateDeviceId(): string {
  return getOrCreateDeviceIdClient();
}
