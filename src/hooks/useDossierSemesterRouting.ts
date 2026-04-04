"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  buildSemesterSearchParams,
  isDossierSemesterLocked,
  resolveDossierSemester,
} from "@/lib/dossier-semester";

type UseDossierSemesterRoutingParams = {
  currentSemester?: number | null;
  supportedSemesters?: readonly number[];
  queryKey?: string;
  legacyQueryKeys?: readonly string[];
  canEditLockedSemesters?: boolean;
};

export function useDossierSemesterRouting({
  currentSemester,
  supportedSemesters,
  queryKey = "semester",
  legacyQueryKeys = ["sem", "semister"],
  canEditLockedSemesters = false,
}: UseDossierSemesterRoutingParams) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const resolution = useMemo(() => {
    const requestedSemester =
      searchParams.get(queryKey) ??
      legacyQueryKeys.map((key) => searchParams.get(key)).find((value) => value !== null) ??
      null;

    return resolveDossierSemester({
      requestedSemester,
      currentSemester,
      supportedSemesters,
    });
  }, [currentSemester, legacyQueryKeys, queryKey, searchParams, supportedSemesters]);

  useEffect(() => {
    const nextParams = buildSemesterSearchParams(searchParams, {
      semester: resolution.activeSemester,
      queryKey,
      legacyQueryKeys,
    });
    const nextSearch = nextParams.toString();
    const currentSearch = searchParams.toString();

    if (nextSearch === currentSearch) return;
    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false });
  }, [legacyQueryKeys, pathname, queryKey, resolution.activeSemester, router, searchParams]);

  const setActiveSemester = useCallback(
    (semester: number) => {
      const nextParams = buildSemesterSearchParams(searchParams, {
        semester,
        queryKey,
        legacyQueryKeys,
      });
      const nextSearch = nextParams.toString();
      router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false });
    },
    [legacyQueryKeys, pathname, queryKey, router, searchParams]
  );

  const isLockedSemester = useCallback(
    (semester: number) =>
      isDossierSemesterLocked({
        semester,
        currentSemester: resolution.currentSemester,
        canBypassLock: canEditLockedSemesters,
      }),
    [canEditLockedSemesters, resolution.currentSemester]
  );

  return {
    activeSemester: resolution.activeSemester,
    currentSemester: resolution.currentSemester,
    supportedSemesters: resolution.supportedSemesters,
    setActiveSemester,
    isLockedSemester,
    isActiveSemesterLocked: isLockedSemester(resolution.activeSemester),
  };
}

