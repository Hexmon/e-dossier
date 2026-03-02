import type { QueryClient } from "@tanstack/react-query";

let globalQueryClient: QueryClient | null = null;

export function setGlobalQueryClient(client: QueryClient | null) {
  globalQueryClient = client;
}

export function clearGlobalQueryClient() {
  if (!globalQueryClient) return;
  globalQueryClient.clear();
}
