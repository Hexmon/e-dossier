"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebouncedValue } from "@/app/lib/debounce";
import { fetchOCs, type OCListRow } from "@/app/lib/api/ocApi";
import { getPlatoons, type Platoon } from "@/app/lib/api/platoonApi";
import { useMe } from "@/hooks/useMe";
import { isOcSelectable } from "@/lib/oc-selection";
import { buildOcModalQueryParams, resolveOcModalScope, type OcModalSort } from "@/lib/oc-modal-scope";
import { ApiClientError } from "@/app/lib/apiClient";

interface OCSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (oc: OCListRow) => void;
  userId?: string;
  disabledOcId?: string | null;
}

const ALL_PLATOONS_VALUE = "__all__";

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) return error.message || fallback;
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

export default function OCSelectModal({
  open,
  onOpenChange,
  onSelect,
  disabledOcId,
}: OCSelectModalProps) {
  const { data: meData, isLoading: meLoading } = useMe();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatoon, setSelectedPlatoon] = useState("");
  const [sortBy, setSortBy] = useState<OcModalSort>("name_asc");
  const [showOcDropdown, setShowOcDropdown] = useState(false);
  const debouncedSearch = useDebouncedValue(searchQuery, 400);

  const { isPlatoonScoped, platoonId: scopePlatoonId } = resolveOcModalScope((meData?.apt as any) ?? null);
  const missingScopedPlatoon = isPlatoonScoped && !scopePlatoonId;

  const platoonsQuery = useQuery({
    queryKey: ["oc-select-modal", "platoons", open],
    queryFn: getPlatoons,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const ocQuery = useQuery({
    queryKey: [
      "oc-select-modal",
      "ocs",
      open,
      selectedPlatoon || null,
      debouncedSearch.trim(),
      sortBy,
    ],
    enabled: open && !missingScopedPlatoon,
    queryFn: () =>
      fetchOCs<OCListRow>(
        buildOcModalQueryParams({
          platoonId: selectedPlatoon || undefined,
          query: debouncedSearch,
          sort: sortBy,
          limit: 20,
        })
      ),
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (!open) return;

    if (isPlatoonScoped) {
      setSelectedPlatoon(scopePlatoonId ?? "");
    }
  }, [open, isPlatoonScoped, scopePlatoonId]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setShowOcDropdown(false);
      setSortBy("name_asc");
      if (!isPlatoonScoped) {
        setSelectedPlatoon("");
      }
    }
  }, [open, isPlatoonScoped]);

  const platoonItems = platoonsQuery.data ?? [];
  const selectedPlatoonRecord = useMemo(
    () => platoonItems.find((item) => item.id === selectedPlatoon) ?? null,
    [platoonItems, selectedPlatoon]
  );
  const selectedPlatoonLabel =
    selectedPlatoonRecord?.name ??
    selectedPlatoonRecord?.key ??
    (isPlatoonScoped ? scopePlatoonId ?? "Assigned platoon" : "All platoons");

  const ocOptions = useMemo(() => {
    const rows = ocQuery.data ?? [];
    return rows.filter((row) => !row.withdrawnOn);
  }, [ocQuery.data]);

  const handleOcSelect = (oc: OCListRow) => {
    const isDisabled = !isOcSelectable(oc.id, disabledOcId);
    if (isDisabled) return;
    onSelect(oc);
    setShowOcDropdown(false);
    setSearchQuery(`${oc.name} (${oc.ocNo})`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <p className="flex items-center justify-center">
              Please Select an OC before proceeding..
            </p>
          </DialogTitle>
        </DialogHeader>

        <div className="mx-auto w-full max-w-md space-y-4">
          {meLoading ? (
            <div className="py-2 text-center text-sm text-muted-foreground">
              Loading user scope...
            </div>
          ) : null}

          {missingScopedPlatoon ? (
            <div className="py-2 text-center text-sm text-destructive">
              Unable to determine platoon scope. Please contact support.
            </div>
          ) : null}

          {!missingScopedPlatoon ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="oc-platoon-select">Platoon</Label>
                <Select
                  value={selectedPlatoon || ALL_PLATOONS_VALUE}
                  onValueChange={(value) => {
                    const next = value === ALL_PLATOONS_VALUE ? "" : value;
                    setSelectedPlatoon(next);
                    setSearchQuery("");
                    setShowOcDropdown(false);
                  }}
                  disabled={isPlatoonScoped || platoonsQuery.isLoading}
                >
                  <SelectTrigger id="oc-platoon-select">
                    <SelectValue placeholder="Select platoon">
                      {isPlatoonScoped ? selectedPlatoonLabel : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {!isPlatoonScoped ? (
                      <SelectItem value={ALL_PLATOONS_VALUE}>All platoons</SelectItem>
                    ) : null}
                    {platoonItems.map((platoon: Platoon) => (
                      <SelectItem key={platoon.id} value={platoon.id}>
                        {platoon.key} | {platoon.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {platoonsQuery.isError ? (
                  <p className="text-sm text-destructive">
                    {toErrorMessage(platoonsQuery.error, "Failed to load platoons.")}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="oc-sort-select">Sort By</Label>
                <Select
                  value={sortBy}
                  onValueChange={(value: OcModalSort) => setSortBy(value)}
                >
                  <SelectTrigger id="oc-sort-select">
                    <SelectValue placeholder="Select sorting" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                    <SelectItem value="updated_desc">Recently Updated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="oc-search-input">OC</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="oc-search-input"
                    placeholder="Search OC by name or OC No..."
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setShowOcDropdown(true);
                    }}
                    onFocus={() => setShowOcDropdown(true)}
                    onBlur={() => setTimeout(() => setShowOcDropdown(false), 150)}
                    className="pl-10"
                  />
                </div>

                {showOcDropdown ? (
                  <ul className="max-h-56 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
                    {ocQuery.isFetching ? (
                      <li className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Searching...
                      </li>
                    ) : null}

                    {!ocQuery.isFetching && ocQuery.isError ? (
                      <li className="px-3 py-2 text-xs text-destructive">
                        {toErrorMessage(ocQuery.error, "Failed to load OCs.")}
                      </li>
                    ) : null}

                    {!ocQuery.isFetching && !ocQuery.isError && ocOptions.length === 0 ? (
                      <li className="px-3 py-2 text-xs text-muted-foreground">No results found.</li>
                    ) : null}

                    {!ocQuery.isFetching &&
                      !ocQuery.isError &&
                      ocOptions.map((oc) => {
                        const isDisabled = !isOcSelectable(oc.id, disabledOcId);
                        return (
                          <li
                            key={oc.id}
                            onMouseDown={() => handleOcSelect(oc)}
                            className={`px-3 py-2 ${isDisabled
                              ? "cursor-not-allowed opacity-50"
                              : "cursor-pointer hover:bg-accent hover:text-accent-foreground"
                              }`}
                          >
                            <div className="text-sm font-medium">{oc.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {oc.ocNo} • {oc.platoonName ?? oc.platoonKey ?? "No platoon"}
                            </div>
                          </li>
                        );
                      })}
                  </ul>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
