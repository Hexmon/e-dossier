import { useQuery } from "@tanstack/react-query";

import { fetchSetupStatus } from "@/app/lib/api/setupApi";
import type { SetupStatus } from "@/app/lib/setup-status";

type UseSetupStatusOptions = {
  refetchOnMount?: boolean | "always";
  refetchOnReconnect?: boolean | "always";
  refetchOnWindowFocus?: boolean | "always";
  staleTime?: number;
};

export function useSetupStatus(
  initialData?: SetupStatus,
  options: UseSetupStatusOptions = {}
) {
  return useQuery({
    queryKey: ["setup-status"],
    queryFn: fetchSetupStatus,
    staleTime: options.staleTime ?? 30_000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnMount: options.refetchOnMount,
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? true,
    refetchOnReconnect: options.refetchOnReconnect ?? true,
    initialData,
  });
}
