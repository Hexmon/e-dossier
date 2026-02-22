"use client";

import { useEffect, useMemo, useState } from "react";

import type { PublicPlatoonCommanderHistoryItem } from "@/app/lib/public-platoons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PublicCommanderHistoryProps = {
  items: PublicPlatoonCommanderHistoryItem[];
};

function formatDate(value: string | null): string {
  if (!value) return "Present";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function PublicCommanderHistory({ items }: PublicCommanderHistoryProps) {
  const defaultSelectedId = useMemo(
    () => items.find((item) => item.status === "CURRENT")?.appointmentId ?? items[0]?.appointmentId ?? null,
    [items],
  );
  const [selectedId, setSelectedId] = useState<string | null>(defaultSelectedId);

  useEffect(() => {
    setSelectedId(defaultSelectedId);
  }, [defaultSelectedId]);

  const selectedCommander = useMemo(
    () => items.find((item) => item.appointmentId === selectedId) ?? null,
    [items, selectedId],
  );

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Platoon Commanders</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No commander history is available for this platoon yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Platoon Commanders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => {
            const active = item.appointmentId === selectedId;
            return (
              <button
                key={item.appointmentId}
                type="button"
                onClick={() => setSelectedId(item.appointmentId)}
                className={cn(
                  "w-full rounded-md border p-3 text-left transition-colors",
                  active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {item.rank} {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.startsAt)} to {formatDate(item.endsAt)}
                    </p>
                  </div>
                  <Badge variant={item.status === "CURRENT" ? "default" : "secondary"}>{item.status}</Badge>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commander Detail</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedCommander ? (
            <p className="text-sm text-muted-foreground">Select a commander to view details.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="text-lg font-semibold">{selectedCommander.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rank</p>
                <p>{selectedCommander.rank}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assignment</p>
                <p>{selectedCommander.assignment}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={selectedCommander.status === "CURRENT" ? "default" : "secondary"}>
                  {selectedCommander.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tenure</p>
                <p>
                  {formatDate(selectedCommander.startsAt)} to {formatDate(selectedCommander.endsAt)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
