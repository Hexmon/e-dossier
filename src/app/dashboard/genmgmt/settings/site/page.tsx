"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import DashboardLayout from "@/components/layout/DashboardLayout";
import SafeImage from "@/components/site-settings/SafeImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { siteSettingsAdminApi, type SiteAwardModel, type SiteCommanderModel, type SiteHistoryModel } from "@/app/lib/api/siteSettingsAdminApi";
import { getPlatoons } from "@/app/lib/api/platoonApi";
import { SITE_SETTINGS_IMAGE_MAX_SIZE_BYTES } from "@/app/lib/validators.site-settings";
import {
  reorderItemsByDrag,
  SITE_SETTINGS_QUERY_KEYS,
  useAdminSiteSettings,
} from "@/hooks/useAdminSiteSettings";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

type SettingsDraft = {
  logoUrl: string | null;
  logoObjectKey: string | null;
  heroTitle: string;
  heroDescription: string;
  commandersSectionTitle: string;
  awardsSectionTitle: string;
  historySectionTitle: string;
};

const DEFAULT_DRAFT: SettingsDraft = {
  logoUrl: null,
  logoObjectKey: null,
  heroTitle: "MCEME",
  heroDescription:
    "Training Excellence for Officer Cadets (OCs) at the Military College of Electronics & Mechanical Engineering",
  commandersSectionTitle: "Commander's Corner",
  awardsSectionTitle: "Gallantry Awards",
  historySectionTitle: "Our History",
};

type CommanderForm = {
  name: string;
  tenure: string;
  description: string;
  imageUrl: string | null;
  imageObjectKey: string | null;
};

const EMPTY_COMMANDER_FORM: CommanderForm = {
  name: "",
  tenure: "",
  description: "",
  imageUrl: null,
  imageObjectKey: null,
};

type AwardForm = {
  title: string;
  description: string;
  category: string;
  imageUrl: string | null;
  imageObjectKey: string | null;
};

const EMPTY_AWARD_FORM: AwardForm = {
  title: "",
  description: "",
  category: "",
  imageUrl: null,
  imageObjectKey: null,
};

type HistoryForm = {
  yearOrDate: string;
  description: string;
};

const EMPTY_HISTORY_FORM: HistoryForm = {
  yearOrDate: "",
  description: "",
};

function parseApiError(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
}

function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Only PNG, JPEG, and WEBP files are allowed.";
  }

  if (file.size > SITE_SETTINGS_IMAGE_MAX_SIZE_BYTES) {
    return "Image exceeds max size of 2MB.";
  }

  return null;
}

export default function AdminSiteSettingsPage() {
  const [historySort, setHistorySort] = useState<"asc" | "desc">("asc");
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft>(DEFAULT_DRAFT);

  const [commanderModalOpen, setCommanderModalOpen] = useState(false);
  const [editingCommander, setEditingCommander] = useState<SiteCommanderModel | null>(null);
  const [commanderForm, setCommanderForm] = useState<CommanderForm>(EMPTY_COMMANDER_FORM);

  const [awardModalOpen, setAwardModalOpen] = useState(false);
  const [editingAward, setEditingAward] = useState<SiteAwardModel | null>(null);
  const [awardForm, setAwardForm] = useState<AwardForm>(EMPTY_AWARD_FORM);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [editingHistory, setEditingHistory] = useState<SiteHistoryModel | null>(null);
  const [historyForm, setHistoryForm] = useState<HistoryForm>(EMPTY_HISTORY_FORM);

  const [draggingAwardId, setDraggingAwardId] = useState<string | null>(null);
  const [awardsLocal, setAwardsLocal] = useState<SiteAwardModel[]>([]);
  const [reorderRetryIds, setReorderRetryIds] = useState<string[] | null>(null);

  const {
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
  } = useAdminSiteSettings(historySort);

  const platoonsQuery = useQuery({
    queryKey: SITE_SETTINGS_QUERY_KEYS.platoons,
    queryFn: () => getPlatoons(),
  });

  useEffect(() => {
    const settings = settingsQuery.data?.settings;
    if (!settings) return;

    setSettingsDraft({
      logoUrl: settings.logoUrl,
      logoObjectKey: settings.logoObjectKey,
      heroTitle: settings.heroTitle,
      heroDescription: settings.heroDescription,
      commandersSectionTitle: settings.commandersSectionTitle,
      awardsSectionTitle: settings.awardsSectionTitle,
      historySectionTitle: settings.historySectionTitle,
    });
  }, [settingsQuery.data?.settings]);

  useEffect(() => {
    setAwardsLocal(awardsQuery.data?.items ?? []);
  }, [awardsQuery.data?.items]);

  const busyMutations =
    updateSettingsMutation.isPending ||
    createCommanderMutation.isPending ||
    updateCommanderMutation.isPending ||
    createAwardMutation.isPending ||
    updateAwardMutation.isPending ||
    createHistoryMutation.isPending ||
    updateHistoryMutation.isPending;

  const hasSettingsError = settingsQuery.isError;
  const hasCommandersError = commandersQuery.isError;
  const hasAwardsError = awardsQuery.isError;
  const hasHistoryError = historyQuery.isError;
  const hasPlatoonsError = platoonsQuery.isError;

  const commanderList = commandersQuery.data?.items ?? [];
  const historyList = historyQuery.data?.items ?? [];

  const canRetryReorder = useMemo(
    () => Boolean(reorderRetryIds && reorderRetryIds.length > 0 && !reorderAwardsMutation.isPending),
    [reorderAwardsMutation.isPending, reorderRetryIds]
  );

  const uploadImageWithPresign = async (file: File) => {
    const invalid = validateImageFile(file);
    if (invalid) {
      throw new Error(invalid);
    }

    const presign = await siteSettingsAdminApi.presignLogo({
      contentType: file.type as "image/png" | "image/jpeg" | "image/webp",
      sizeBytes: file.size,
    });

    const uploadResponse = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error("Image upload failed.");
    }

    return {
      imageUrl: presign.publicUrl,
      imageObjectKey: presign.objectKey,
    };
  };

  const handleSaveSettings = async () => {
    try {
      await updateSettingsMutation.mutateAsync(settingsDraft);
      toast.success("Site settings saved.");
    } catch (error) {
      toast.error(parseApiError(error, "Failed to save site settings."));
    }
  };

  const handleDeleteLogo = async () => {
    if (!window.confirm("Delete current logo?")) return;

    try {
      const response = await deleteLogoMutation.mutateAsync();
      setSettingsDraft((prev) => ({
        ...prev,
        logoUrl: response.settings.logoUrl,
        logoObjectKey: response.settings.logoObjectKey,
      }));
      toast.success("Logo removed.");
    } catch (error) {
      toast.error(parseApiError(error, "Failed to delete logo."));
    }
  };

  const openCreateCommander = () => {
    setEditingCommander(null);
    setCommanderForm(EMPTY_COMMANDER_FORM);
    setCommanderModalOpen(true);
  };

  const openEditCommander = (item: SiteCommanderModel) => {
    setEditingCommander(item);
    setCommanderForm({
      name: item.name,
      tenure: item.tenure,
      description: item.description,
      imageUrl: item.imageUrl ?? null,
      imageObjectKey: item.imageObjectKey ?? null,
    });
    setCommanderModalOpen(true);
  };

  const submitCommander = async () => {
    if (!commanderForm.name || !commanderForm.tenure || !commanderForm.description) {
      toast.error("Name, tenure, and description are required.");
      return;
    }

    try {
      if (editingCommander) {
        await updateCommanderMutation.mutateAsync({
          id: editingCommander.id,
          payload: commanderForm,
        });
      } else {
        await createCommanderMutation.mutateAsync(commanderForm as any);
      }

      toast.success(editingCommander ? "Commander updated." : "Commander created.");
      setCommanderModalOpen(false);
    } catch (error) {
      toast.error(parseApiError(error, "Failed to save commander."));
    }
  };

  const deleteCommander = async (id: string, hard = false) => {
    if (!window.confirm(hard ? "Hard delete this commander?" : "Soft delete this commander?")) return;

    try {
      await deleteCommanderMutation.mutateAsync({ id, hard });
      toast.success(hard ? "Commander hard-deleted." : "Commander soft-deleted.");
    } catch (error) {
      toast.error(parseApiError(error, "Failed to delete commander."));
    }
  };

  const openCreateAward = () => {
    setEditingAward(null);
    setAwardForm(EMPTY_AWARD_FORM);
    setAwardModalOpen(true);
  };

  const openEditAward = (item: SiteAwardModel) => {
    setEditingAward(item);
    setAwardForm({
      title: item.title,
      description: item.description,
      category: item.category,
      imageUrl: item.imageUrl ?? null,
      imageObjectKey: item.imageObjectKey ?? null,
    });
    setAwardModalOpen(true);
  };

  const submitAward = async () => {
    if (!awardForm.title || !awardForm.description || !awardForm.category) {
      toast.error("Title, description, and category are required.");
      return;
    }

    try {
      if (editingAward) {
        await updateAwardMutation.mutateAsync({
          id: editingAward.id,
          payload: awardForm,
        });
      } else {
        await createAwardMutation.mutateAsync(awardForm as any);
      }

      toast.success(editingAward ? "Award updated." : "Award created.");
      setAwardModalOpen(false);
    } catch (error) {
      toast.error(parseApiError(error, "Failed to save award."));
    }
  };

  const deleteAward = async (id: string, hard = false) => {
    if (!window.confirm(hard ? "Hard delete this award?" : "Soft delete this award?")) return;

    try {
      await deleteAwardMutation.mutateAsync({ id, hard });
      toast.success(hard ? "Award hard-deleted." : "Award soft-deleted.");
    } catch (error) {
      toast.error(parseApiError(error, "Failed to delete award."));
    }
  };

  const reorderAwards = async (nextAwards: SiteAwardModel[], previousAwards: SiteAwardModel[]) => {
    const orderedIds = nextAwards.map((item) => item.id);

    try {
      await reorderAwardsMutation.mutateAsync(orderedIds);
      setReorderRetryIds(null);
      toast.success("Awards reordered.");
    } catch (error) {
      setAwardsLocal(previousAwards);
      setReorderRetryIds(orderedIds);
      toast.error(parseApiError(error, "Reorder failed. You can retry."));
    }
  };

  const onDropAward = async (destinationId: string) => {
    if (!draggingAwardId) return;

    const previous = [...awardsLocal];
    const next = reorderItemsByDrag(awardsLocal, draggingAwardId, destinationId);
    setDraggingAwardId(null);

    if (next === awardsLocal) return;

    setAwardsLocal(next);
    await reorderAwards(next, previous);
  };

  const retryReorder = async () => {
    if (!reorderRetryIds) return;

    try {
      await reorderAwardsMutation.mutateAsync(reorderRetryIds);
      setReorderRetryIds(null);
      toast.success("Reorder retried successfully.");
    } catch (error) {
      toast.error(parseApiError(error, "Retry reorder failed."));
    }
  };

  const openCreateHistory = () => {
    setEditingHistory(null);
    setHistoryForm(EMPTY_HISTORY_FORM);
    setHistoryModalOpen(true);
  };

  const openEditHistory = (item: SiteHistoryModel) => {
    setEditingHistory(item);
    setHistoryForm({
      yearOrDate: item.yearOrDate,
      description: item.description,
    });
    setHistoryModalOpen(true);
  };

  const submitHistory = async () => {
    if (!historyForm.yearOrDate || !historyForm.description) {
      toast.error("Year/Date and description are required.");
      return;
    }

    try {
      if (editingHistory) {
        await updateHistoryMutation.mutateAsync({ id: editingHistory.id, payload: historyForm });
      } else {
        await createHistoryMutation.mutateAsync(historyForm as any);
      }

      toast.success(editingHistory ? "History updated." : "History created.");
      setHistoryModalOpen(false);
    } catch (error) {
      toast.error(parseApiError(error, "Failed to save history entry."));
    }
  };

  const deleteHistory = async (id: string, hard = false) => {
    if (!window.confirm(hard ? "Hard delete this history entry?" : "Soft delete this history entry?")) return;

    try {
      await deleteHistoryMutation.mutateAsync({ id, hard });
      toast.success(hard ? "History hard-deleted." : "History soft-deleted.");
    } catch (error) {
      toast.error(parseApiError(error, "Failed to delete history entry."));
    }
  };

  return (
    <DashboardLayout
      title="Admin Site Settings"
      description="Manage landing page branding, hero, commanders, awards, and history."
    >
      <section className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Branding & Hero</CardTitle>
            <CardDescription>
              Manage landing logo, hero content, and section titles. Save keeps your values even if a request fails.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {hasSettingsError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
                Failed to load site settings.
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-3"
                  onClick={() => settingsQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
              <div className="space-y-3">
                <Label>Current Logo</Label>
                <SafeImage
                  src={settingsDraft.logoUrl}
                  alt="Site logo"
                  fallbackSrc="/images/eme_logo.jpeg"
                  className="h-24 w-24 rounded border object-contain bg-white"
                />
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;

                      try {
                        const uploaded = await uploadImageWithPresign(file);
                        setSettingsDraft((prev) => ({
                          ...prev,
                          logoUrl: uploaded.imageUrl,
                          logoObjectKey: uploaded.imageObjectKey,
                        }));
                        toast.success("Logo uploaded. Save settings to publish.");
                      } catch (error) {
                        toast.error(parseApiError(error, "Logo upload failed."));
                      } finally {
                        event.currentTarget.value = "";
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDeleteLogo}
                    disabled={deleteLogoMutation.isPending || !settingsDraft.logoUrl}
                  >
                    {deleteLogoMutation.isPending ? "Deleting..." : "Delete Logo"}
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="hero-title">Hero Title</Label>
                  <Input
                    id="hero-title"
                    value={settingsDraft.heroTitle}
                    onChange={(event) =>
                      setSettingsDraft((prev) => ({ ...prev, heroTitle: event.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="hero-description">Hero Description</Label>
                  <Textarea
                    id="hero-description"
                    value={settingsDraft.heroDescription}
                    onChange={(event) =>
                      setSettingsDraft((prev) => ({ ...prev, heroDescription: event.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commanders-title">Commander Section Title</Label>
                  <Input
                    id="commanders-title"
                    value={settingsDraft.commandersSectionTitle}
                    onChange={(event) =>
                      setSettingsDraft((prev) => ({
                        ...prev,
                        commandersSectionTitle: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="awards-title">Awards Section Title</Label>
                  <Input
                    id="awards-title"
                    value={settingsDraft.awardsSectionTitle}
                    onChange={(event) =>
                      setSettingsDraft((prev) => ({ ...prev, awardsSectionTitle: event.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="history-title">History Section Title</Label>
                  <Input
                    id="history-title"
                    value={settingsDraft.historySectionTitle}
                    onChange={(event) =>
                      setSettingsDraft((prev) => ({ ...prev, historySectionTitle: event.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="button" onClick={handleSaveSettings} disabled={updateSettingsMutation.isPending}>
              {updateSettingsMutation.isPending ? "Saving..." : "Save Site Settings"}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platoons Preview (Read Only)</CardTitle>
            <CardDescription>Uses existing platoons API and remains resilient to request failures.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasPlatoonsError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
                Unable to load platoons.
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-3"
                  onClick={() => platoonsQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : platoonsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading platoons...</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                {(platoonsQuery.data ?? []).map((item) => (
                  <div key={item.id} className="rounded-md border p-3">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.key}</p>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{item.about}</p>
                  </div>
                ))}
                {(platoonsQuery.data ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No platoons available.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{settingsDraft.commandersSectionTitle}</CardTitle>
              <CardDescription>Manage commander cards displayed on landing page.</CardDescription>
            </div>
            <Button type="button" onClick={openCreateCommander}>Add Commander</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasCommandersError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
                Unable to load commanders.
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-3"
                  onClick={() => commandersQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : commandersQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading commanders...</p>
            ) : commanderList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No commanders added yet.</p>
            ) : (
              <div className="space-y-2">
                {commanderList.map((item) => (
                  <div key={item.id} className="rounded-md border p-3">
                    <div className="flex items-center gap-4">
                      <SafeImage
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-14 w-14 rounded-full border object-cover"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.tenure}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => openEditCommander(item)}>
                          Edit
                        </Button>
                        <Button type="button" variant="outline" onClick={() => deleteCommander(item.id)}>
                          Soft Delete
                        </Button>
                        <Button type="button" variant="destructive" onClick={() => deleteCommander(item.id, true)}>
                          Hard Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{settingsDraft.awardsSectionTitle}</CardTitle>
              <CardDescription>
                Drag and drop to reorder. If save fails, order is rolled back and retry is available.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {canRetryReorder && (
                <Button type="button" variant="outline" onClick={retryReorder}>
                  Retry Reorder
                </Button>
              )}
              <Button type="button" onClick={openCreateAward}>Add Award</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasAwardsError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
                Unable to load awards.
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-3"
                  onClick={() => awardsQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : awardsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading awards...</p>
            ) : awardsLocal.length === 0 ? (
              <p className="text-sm text-muted-foreground">No awards added yet.</p>
            ) : (
              awardsLocal.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border p-3"
                  draggable
                  onDragStart={() => setDraggingAwardId(item.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    void onDropAward(item.id);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <SafeImage
                      src={item.imageUrl}
                      alt={item.title}
                      fallbackSrc="/images/gallantry-awards.jpg"
                      className="h-14 w-14 rounded border object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{item.sortOrder}. {item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => openEditAward(item)}>
                        Edit
                      </Button>
                      <Button type="button" variant="outline" onClick={() => deleteAward(item.id)}>
                        Soft Delete
                      </Button>
                      <Button type="button" variant="destructive" onClick={() => deleteAward(item.id, true)}>
                        Hard Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{settingsDraft.historySectionTitle}</CardTitle>
              <CardDescription>Manage timeline entries and sort direction preview.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={historySort === "asc" ? "default" : "outline"}
                onClick={() => setHistorySort("asc")}
              >
                Sort ASC
              </Button>
              <Button
                type="button"
                variant={historySort === "desc" ? "default" : "outline"}
                onClick={() => setHistorySort("desc")}
              >
                Sort DESC
              </Button>
              <Button type="button" onClick={openCreateHistory}>Add History</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasHistoryError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
                Unable to load history.
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-3"
                  onClick={() => historyQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : historyQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading history...</p>
            ) : historyList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No history entries yet.</p>
            ) : (
              historyList.map((item) => (
                <div key={item.id} className="rounded-md border p-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground">
                      {item.yearOrDate}
                    </div>
                    <p className="flex-1 text-sm text-muted-foreground">{item.description}</p>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => openEditHistory(item)}>
                        Edit
                      </Button>
                      <Button type="button" variant="outline" onClick={() => deleteHistory(item.id)}>
                        Soft Delete
                      </Button>
                      <Button type="button" variant="destructive" onClick={() => deleteHistory(item.id, true)}>
                        Hard Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Dialog open={commanderModalOpen} onOpenChange={(next) => !busyMutations && setCommanderModalOpen(next)}>
        <DialogContent onInteractOutside={(event) => busyMutations && event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editingCommander ? "Edit Commander" : "Add Commander"}</DialogTitle>
            <DialogDescription>Save updates content for the public landing page.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={commanderForm.name}
                onChange={(event) =>
                  setCommanderForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label>Tenure</Label>
              <Input
                value={commanderForm.tenure}
                onChange={(event) =>
                  setCommanderForm((prev) => ({ ...prev, tenure: event.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={commanderForm.description}
                onChange={(event) =>
                  setCommanderForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label>Image</Label>
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;

                  try {
                    const uploaded = await uploadImageWithPresign(file);
                    setCommanderForm((prev) => ({
                      ...prev,
                      imageUrl: uploaded.imageUrl,
                      imageObjectKey: uploaded.imageObjectKey,
                    }));
                    toast.success("Commander image uploaded.");
                  } catch (error) {
                    toast.error(parseApiError(error, "Commander image upload failed."));
                  } finally {
                    event.currentTarget.value = "";
                  }
                }}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCommanderModalOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void submitCommander()}>
                {editingCommander ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={awardModalOpen} onOpenChange={(next) => !busyMutations && setAwardModalOpen(next)}>
        <DialogContent onInteractOutside={(event) => busyMutations && event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editingAward ? "Edit Award" : "Add Award"}</DialogTitle>
            <DialogDescription>Manage award cards shown publicly.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input
                value={awardForm.title}
                onChange={(event) => setAwardForm((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label>Category</Label>
              <Input
                value={awardForm.category}
                onChange={(event) => setAwardForm((prev) => ({ ...prev, category: event.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={awardForm.description}
                onChange={(event) =>
                  setAwardForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label>Image</Label>
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;

                  try {
                    const uploaded = await uploadImageWithPresign(file);
                    setAwardForm((prev) => ({
                      ...prev,
                      imageUrl: uploaded.imageUrl,
                      imageObjectKey: uploaded.imageObjectKey,
                    }));
                    toast.success("Award image uploaded.");
                  } catch (error) {
                    toast.error(parseApiError(error, "Award image upload failed."));
                  } finally {
                    event.currentTarget.value = "";
                  }
                }}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAwardModalOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void submitAward()}>
                {editingAward ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={historyModalOpen} onOpenChange={(next) => !busyMutations && setHistoryModalOpen(next)}>
        <DialogContent onInteractOutside={(event) => busyMutations && event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editingHistory ? "Edit History" : "Add History"}</DialogTitle>
            <DialogDescription>Maintain timeline entries for landing page.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Year / Date</Label>
              <Input
                value={historyForm.yearOrDate}
                onChange={(event) =>
                  setHistoryForm((prev) => ({ ...prev, yearOrDate: event.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={historyForm.description}
                onChange={(event) =>
                  setHistoryForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setHistoryModalOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void submitHistory()}>
                {editingHistory ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
