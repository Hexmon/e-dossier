"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SafeImage from "@/components/site-settings/SafeImage";
import { Platoon } from "@/types/platoon";
import type { PlatoonCommanderHistoryItem } from "@/app/lib/api/platoonApi";
import { DEFAULT_PLATOON_THEME_COLOR, normalizePlatoonThemeColor } from "@/lib/platoon-theme";

interface PlatoonViewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  platoon?: Platoon;
  commanderHistory?: PlatoonCommanderHistoryItem[];
  historyLoading?: boolean;
}

export default function PlatoonViewDialog({
  isOpen,
  onOpenChange,
  platoon,
  commanderHistory = [],
  historyLoading = false,
}: PlatoonViewDialogProps) {
  if (!platoon) return null;

  const { key, name, about, createdAt, updatedAt, themeColor, imageUrl } = platoon;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Platoon Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="overflow-hidden rounded border">
            <SafeImage
              src={imageUrl}
              alt={`${name} platoon`}
              fallbackSrc="/images/commander-placeholder.jpg"
              className="h-48 w-full object-cover"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="font-semibold text-sm text-muted-foreground">Platoon Key</p>
              <p className="text-lg">{key || "-"}</p>
            </div>

            <div>
              <p className="font-semibold text-sm text-muted-foreground">Platoon Name</p>
              <p className="text-lg">{name || "-"}</p>
            </div>
          </div>

          <div>
            <p className="font-semibold text-sm text-muted-foreground">Theme Color</p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="h-4 w-4 rounded border"
                style={{ backgroundColor: normalizePlatoonThemeColor(themeColor ?? DEFAULT_PLATOON_THEME_COLOR) }}
              />
              <p className="text-sm">{normalizePlatoonThemeColor(themeColor ?? DEFAULT_PLATOON_THEME_COLOR)}</p>
            </div>
          </div>

          <div>
            <p className="font-semibold text-sm text-muted-foreground">About</p>
            <p className="text-sm">{about || "No description provided"}</p>
          </div>

          <div className="pt-4 border-t">
            <p className="font-semibold text-sm text-muted-foreground mb-2">Commander History</p>
            {historyLoading ? (
              <p className="text-sm text-muted-foreground">Loading commander history...</p>
            ) : commanderHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No commander history available.</p>
            ) : (
              <div className="space-y-2">
                {commanderHistory.map((item) => (
                  <div key={item.appointmentId} className="rounded border p-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{item.rank} {item.name} ({item.username})</p>
                      <span
                        className={
                          item.status === "CURRENT"
                            ? "rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                            : "rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                        }
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(item.startsAt)} to {item.endsAt ? formatDate(item.endsAt) : "Present"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t">
            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
              <div>
                <p className="font-semibold">Created</p>
                <p>{createdAt ? formatDate(createdAt) : "-"}</p>
              </div>
              <div>
                <p className="font-semibold">Last Updated</p>
                <p>{updatedAt ? formatDate(updatedAt) : "-"}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Invalid date";
  }
}
