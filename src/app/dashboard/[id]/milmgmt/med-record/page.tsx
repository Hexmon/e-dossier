import React from "react";
import { redirect } from "next/navigation";

import MedicalRecordsPageClient from "@/components/medical/MedicalRecordsPageClient";
import {
  buildSemesterSearchParams,
  normalizeSemesterValue,
} from "@/lib/dossier-semester";

type PageParams = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function toUrlSearchParams(
  search: Record<string, string | string[] | undefined>
): URLSearchParams {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(search)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        params.append(key, entry);
      }
      continue;
    }

    if (typeof value === "string") {
      params.set(key, value);
    }
  }

  return params;
}

export default async function MedicalRecordsPage(props: {
  params: PageParams;
  searchParams?: SearchParams;
}) {
  const [{ id }, resolvedSearchParams = {}] = await Promise.all([
    props.params,
    props.searchParams,
  ]);

  const semester =
    typeof resolvedSearchParams.semester === "string"
      ? resolvedSearchParams.semester
      : null;
  const legacySemester =
    typeof resolvedSearchParams.sem === "string"
      ? resolvedSearchParams.sem
      : typeof resolvedSearchParams.semister === "string"
        ? resolvedSearchParams.semister
        : null;

  if (!semester && legacySemester) {
    const normalizedLegacySemester = normalizeSemesterValue(legacySemester);
    if (normalizedLegacySemester !== null) {
      const nextParams = buildSemesterSearchParams(
        toUrlSearchParams(resolvedSearchParams),
        {
          semester: normalizedLegacySemester,
        }
      );
      const nextSearch = nextParams.toString();
      redirect(
        nextSearch
          ? `/dashboard/${id}/milmgmt/med-record?${nextSearch}`
          : `/dashboard/${id}/milmgmt/med-record`
      );
    }
  }

  return <MedicalRecordsPageClient ocId={id} />;
}
