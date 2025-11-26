import { DrillRow } from "@/types/club-detls";

export const calculateDrillTotals = (drillRows: DrillRow[]) =>
    drillRows.slice(0, 3).reduce(
        (acc, row) => ({
            maxMks: acc.maxMks + Number(row.maxMks || 0),
            m1: acc.m1 + Number(row.m1 || 0),
            m2: acc.m2 + Number(row.m2 || 0),
            a1c1: acc.a1c1 + Number(row.a1c1 || 0),
            a2c2: acc.a2c2 + Number(row.a2c2 || 0),
        }),
        { maxMks: 0, m1: 0, m2: 0, a1c1: 0, a2c2: 0 }
    );
