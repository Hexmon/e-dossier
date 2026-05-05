import type { HikeRow } from "@/types/hike";

type HikeDateFields = Pick<HikeRow, "reason" | "dateFrom" | "dateTo" | "remark">;

const hasValue = (value: string | null | undefined) => Boolean(value?.trim());

export function hasEnteredHikeData(row: Partial<HikeDateFields>) {
    return hasValue(row.reason) || hasValue(row.dateFrom) || hasValue(row.dateTo) || hasValue(row.remark);
}

export function isHikeMissingDates(row: Partial<HikeDateFields>) {
    if (!hasEnteredHikeData(row)) return false;
    return !hasValue(row.dateFrom) || !hasValue(row.dateTo);
}
