// Handles Excel serial dates, mixed string formats, and renders DD-MMM-YYYY

export function fromExcelSerial(n: number): Date {
  const epoch = Date.UTC(1899, 11, 30);
  return new Date(epoch + Math.round(n) * 86400000);
}

function monthName(m: number): string {
  return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m]!;
}

export function formatDMY(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mon = monthName(d.getUTCMonth());
  const yyyy = d.getUTCFullYear();
  return `${dd}-${mon}-${yyyy}`; // 22-Jun-2025
}

export function normalizeToDate(val: unknown): Date | null {
  if (val == null) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;

  if (typeof val === "number" && isFinite(val)) return fromExcelSerial(val);
  if (typeof val === "string" && /^\d{4,6}$/.test(val.trim())) {
    return fromExcelSerial(parseInt(val.trim(), 10));
  }

  if (typeof val === "string") {
    const s = val.trim();
    const m = s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,})[-/ ](\d{2,4})$/);
    if (m) {
      const day = parseInt(m[1], 10);
      const monStr = m[2].slice(0,3).toLowerCase();
      const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
      const mi = months.indexOf(monStr);
      if (mi >= 0) {
        let year = parseInt(m[3], 10);
        if (m[3].length === 2) year += 2000;
        const d = new Date(Date.UTC(year, mi, day));
        if (!isNaN(d.getTime())) return d;
      }
    }
    const d2 = new Date(s);
    if (!isNaN(d2.getTime())) return d2;
  }

  return null;
}

export function toDisplayDMY(val: unknown): string {
  const d = normalizeToDate(val);
  return d ? formatDMY(d) : "";
}
