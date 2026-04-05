import { useQuery } from "@tanstack/react-query";

import { fetchSetupStatus } from "@/app/lib/api/setupApi";
import type { SetupStatus } from "@/app/lib/setup-status";

export function useSetupStatus(initialData?: SetupStatus) {
  return useQuery({
    queryKey: ["setup-status"],
    queryFn: fetchSetupStatus,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    initialData,
  });
}
