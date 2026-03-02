import { randomInt } from 'node:crypto';

export function generateReportVersionId(now = new Date()): string {
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const suffix = String(randomInt(0, 1_000_000)).padStart(6, '0');
  return `RPT-${yy}${mm}${dd}-${suffix}`;
}

export function sanitizePdfFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9-_\. ]+/g, '_')
    .replace(/\s+/g, '-')
    .slice(0, 120);
}
