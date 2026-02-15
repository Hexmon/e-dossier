// hooks/useMe.ts
import { useQuery } from "@tanstack/react-query";
import { fetchMe, MeResponse } from "@/app/lib/api/me";
import { useDeviceRefreshInterval } from "@/hooks/useDeviceRefreshInterval";

export function useMe() {
    const { refreshIntervalMs } = useDeviceRefreshInterval();

    return useQuery({
        queryKey: ["me"],
        queryFn: fetchMe,
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchInterval: refreshIntervalMs || false,
        refetchIntervalInBackground: false,
    });
}
