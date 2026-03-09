import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { interviewPendingTickerSettingsApi } from "@/app/lib/api/interviewPendingTickerSettingsApi";

const QUERY_KEY_ROOT = ["interview-pending-ticker-settings"] as const;

export function useInterviewPendingTickerSettings(params?: {
  includeLogs?: boolean;
  limit?: number;
  offset?: number;
}) {
  const queryClient = useQueryClient();
  const includeLogs = Boolean(params?.includeLogs);
  const limit = params?.limit ?? 20;
  const offset = params?.offset ?? 0;

  const query = useQuery({
    queryKey: [...QUERY_KEY_ROOT, includeLogs, limit, offset],
    queryFn: () =>
      interviewPendingTickerSettingsApi.get({
        includeLogs,
        limit,
        offset,
      }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: interviewPendingTickerSettingsApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY_ROOT });
    },
  });

  return {
    query,
    createMutation,
  };
}
