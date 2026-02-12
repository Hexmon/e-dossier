import { deviceSiteSettingsApi, type UpsertDeviceSiteSettingsInput } from "@/app/lib/api/deviceSiteSettingsApi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useDeviceSiteSettings(deviceId: string) {
  const queryClient = useQueryClient();
  const key = ["device-site-settings", deviceId] as const;

  const query = useQuery({
    queryKey: key,
    queryFn: () => deviceSiteSettingsApi.getForDevice(deviceId),
    enabled: deviceId.length > 0,
  });

  const update = useMutation({
    mutationFn: (input: UpsertDeviceSiteSettingsInput) => deviceSiteSettingsApi.upsertForDevice(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  return {
    query,
    update,
  };
}
