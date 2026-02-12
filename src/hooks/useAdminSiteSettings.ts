import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { siteSettingsAdminApi } from "@/app/lib/api/siteSettingsAdminApi";

export const SITE_SETTINGS_QUERY_KEYS = {
  settings: ["admin-site-settings", "settings"] as const,
  commanders: ["admin-site-settings", "commanders"] as const,
  awards: ["admin-site-settings", "awards"] as const,
  history: (sort: "asc" | "desc") => ["admin-site-settings", "history", sort] as const,
  platoons: ["admin-site-settings", "platoons-preview"] as const,
};

export function reorderItemsByDrag<T extends { id: string }>(
  items: T[],
  sourceId: string,
  destinationId: string
): T[] {
  if (sourceId === destinationId) {
    return items;
  }

  const sourceIndex = items.findIndex((item) => item.id === sourceId);
  const destinationIndex = items.findIndex((item) => item.id === destinationId);

  if (sourceIndex < 0 || destinationIndex < 0) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(destinationIndex, 0, moved);

  return next.map((item, index) => ({
    ...item,
    sortOrder: index + 1,
  }));
}

export function useAdminSiteSettings(sort: "asc" | "desc") {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: SITE_SETTINGS_QUERY_KEYS.settings,
    queryFn: () => siteSettingsAdminApi.getSettings(),
  });

  const commandersQuery = useQuery({
    queryKey: SITE_SETTINGS_QUERY_KEYS.commanders,
    queryFn: () => siteSettingsAdminApi.listCommanders(),
  });

  const awardsQuery = useQuery({
    queryKey: SITE_SETTINGS_QUERY_KEYS.awards,
    queryFn: () => siteSettingsAdminApi.listAwards(),
  });

  const historyQuery = useQuery({
    queryKey: SITE_SETTINGS_QUERY_KEYS.history(sort),
    queryFn: () => siteSettingsAdminApi.listHistory(sort),
  });

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: SITE_SETTINGS_QUERY_KEYS.settings }),
      queryClient.invalidateQueries({ queryKey: SITE_SETTINGS_QUERY_KEYS.commanders }),
      queryClient.invalidateQueries({ queryKey: SITE_SETTINGS_QUERY_KEYS.awards }),
      queryClient.invalidateQueries({ queryKey: SITE_SETTINGS_QUERY_KEYS.history("asc") }),
      queryClient.invalidateQueries({ queryKey: SITE_SETTINGS_QUERY_KEYS.history("desc") }),
    ]);
  };

  const updateSettingsMutation = useMutation({
    mutationFn: siteSettingsAdminApi.updateSettings,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SITE_SETTINGS_QUERY_KEYS.settings });
    },
  });

  const deleteLogoMutation = useMutation({
    mutationFn: siteSettingsAdminApi.deleteLogo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SITE_SETTINGS_QUERY_KEYS.settings });
    },
  });

  const createCommanderMutation = useMutation({
    mutationFn: siteSettingsAdminApi.createCommander,
    onSuccess: invalidateAll,
  });

  const updateCommanderMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof siteSettingsAdminApi.updateCommander>[1] }) =>
      siteSettingsAdminApi.updateCommander(id, payload),
    onSuccess: invalidateAll,
  });

  const deleteCommanderMutation = useMutation({
    mutationFn: async ({ id, hard }: { id: string; hard?: boolean }) => {
      if (hard) {
        await siteSettingsAdminApi.hardDeleteCommander(id);
        return;
      }
      await siteSettingsAdminApi.deleteCommander(id);
    },
    onSuccess: invalidateAll,
  });

  const createAwardMutation = useMutation({
    mutationFn: siteSettingsAdminApi.createAward,
    onSuccess: invalidateAll,
  });

  const updateAwardMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof siteSettingsAdminApi.updateAward>[1] }) =>
      siteSettingsAdminApi.updateAward(id, payload),
    onSuccess: invalidateAll,
  });

  const deleteAwardMutation = useMutation({
    mutationFn: async ({ id, hard }: { id: string; hard?: boolean }) => {
      if (hard) {
        await siteSettingsAdminApi.hardDeleteAward(id);
        return;
      }
      await siteSettingsAdminApi.deleteAward(id);
    },
    onSuccess: invalidateAll,
  });

  const reorderAwardsMutation = useMutation({
    mutationFn: (orderedIds: string[]) => siteSettingsAdminApi.reorderAwards(orderedIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SITE_SETTINGS_QUERY_KEYS.awards });
    },
  });

  const createHistoryMutation = useMutation({
    mutationFn: siteSettingsAdminApi.createHistory,
    onSuccess: invalidateAll,
  });

  const updateHistoryMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof siteSettingsAdminApi.updateHistory>[1] }) =>
      siteSettingsAdminApi.updateHistory(id, payload),
    onSuccess: invalidateAll,
  });

  const deleteHistoryMutation = useMutation({
    mutationFn: async ({ id, hard }: { id: string; hard?: boolean }) => {
      if (hard) {
        await siteSettingsAdminApi.hardDeleteHistory(id);
        return;
      }
      await siteSettingsAdminApi.deleteHistory(id);
    },
    onSuccess: invalidateAll,
  });

  return {
    settingsQuery,
    commandersQuery,
    awardsQuery,
    historyQuery,
    updateSettingsMutation,
    deleteLogoMutation,
    createCommanderMutation,
    updateCommanderMutation,
    deleteCommanderMutation,
    createAwardMutation,
    updateAwardMutation,
    deleteAwardMutation,
    reorderAwardsMutation,
    createHistoryMutation,
    updateHistoryMutation,
    deleteHistoryMutation,
  };
}
