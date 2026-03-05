import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const DOWNLOAD_ROUTE_FILES = [
  'src/app/api/v1/reports/academics/consolidated-sessional/download/route.ts',
  'src/app/api/v1/reports/academics/semester-grade/download/route.ts',
  'src/app/api/v1/reports/academics/final-result-compilation/download/route.ts',
  'src/app/api/v1/reports/mil-training/physical-assessment/download/route.ts',
  'src/app/api/v1/reports/overall-training/course-wise-performance/download/route.ts',
  'src/app/api/v1/reports/overall-training/course-wise-final-performance/download/route.ts',
] as const;

describe('report download versioning coverage', () => {
  it('keeps version generation + persistence in every active download route', () => {
    for (const file of DOWNLOAD_ROUTE_FILES) {
      const absolutePath = path.resolve(process.cwd(), file);
      const content = readFileSync(absolutePath, 'utf8');

      expect(content, `${file} should generate report version id`).toMatch(/generateReportVersionId/);
      expect(content, `${file} should include version id in render payload`).toMatch(/versionId/);
      expect(content, `${file} should persist report version row`).toMatch(
        /createReportDownloadVersion|createReportDownloadVersionsBatch/
      );
    }
  });
});
