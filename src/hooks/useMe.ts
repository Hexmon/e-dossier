// hooks/useMe.ts
import { useQuery } from "@tanstack/react-query";
import { fetchMe, MeResponse } from "@/app/lib/api/me";

export function useMe() {
    return useQuery({
        queryKey: ["me"],
        queryFn: fetchMe,
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
}