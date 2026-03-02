import fs from 'node:fs';
import path from 'node:path';
import type { CourseWiseFinalPerformancePreview, CourseWiseFinalPerformanceRow } from '@/types/reports';

type ReportRenderMeta = {
  versionId: string;
  generatedAt: Date;
};

const PAGE_MARGIN = 24;
const FIRST_PAGE_TABLE_Y = 102;
const CONTINUATION_TABLE_Y = 34;
const TABLE_HEADER_H1 = 36;
const TABLE_HEADER_H2 = 18;
const DATA_ROW_H = 20;
const PAGE_META_HEIGHT = 20;

const COLUMN_BASE_WIDTHS: Record<string, number> = {
  sNo: 30,
  tesNo: 46,
  rank: 36,
  name: 128,
  academics: 74,
  ptSwimming: 66,
  games: 68,
  olq: 62,
  cfe: 62,
  cdrMarks: 62,
  camp: 58,
  drill: 58,
  grandTotal: 74,
  percentage: 40,
  orderOfMerit: 42,
  piAllotment: 76,
};

const TABLE_COLUMNS: Array<{
  key: keyof CourseWiseFinalPerformanceRow | 'sNo';
  label: string;
  max: string | null;
}> = [
  { key: 'sNo', label: 'S. No', max: null },
  { key: 'tesNo', label: 'TES No', max: null },
  { key: 'rank', label: 'Rank', max: null },
  { key: 'name', label: 'Name', max: null },
  { key: 'academics', label: 'Academics\n(Incl Service Subject)', max: 'MM 8100' },
  { key: 'ptSwimming', label: 'PT &\nSwimming', max: 'MM 900' },
  { key: 'games', label: 'Games +\nX-Country', max: 'MM 600' },
  { key: 'olq', label: 'OLQ', max: 'MM 1800' },
  { key: 'cfe', label: 'Credit for\nExcellence', max: 'MM 150' },
  { key: 'cdrMarks', label: "Cdr's Mks", max: 'MM 150' },
  { key: 'camp', label: 'Camp Mks', max: 'MM 210' },
  { key: 'drill', label: 'Drill Mks', max: 'MM 90' },
  { key: 'grandTotal', label: 'Grand Total', max: 'MM 12000' },
  { key: 'percentage', label: '%', max: null },
  { key: 'orderOfMerit', label: 'OM', max: null },
  { key: 'piAllotment', label: 'PI Allotment', max: null },
];

function resolveImagePath(candidates: string[]) {
  for (const relativePath of candidates) {
    const fullPath = path.join(process.cwd(), relativePath);
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return null;
}

function drawRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
  doc.rect(x, y, w, h).stroke();
}

function drawLine(doc: PDFKit.PDFDocument, x1: number, y1: number, x2: number, y2: number) {
  doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
}

function textInBox(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  opts: {
    align?: 'left' | 'center' | 'right';
    bold?: boolean;
    size?: number;
    lineBreak?: boolean;
  } = {}
) {
  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size ?? 8);
  doc.text(text, x + 2, y + 2, {
    width: Math.max(0, width - 4),
    height: Math.max(0, height - 4),
    align: opts.align ?? 'center',
    lineBreak: opts.lineBreak ?? false,
    ellipsis: true,
  });
}

function drawHeading(doc: PDFKit.PDFDocument, data: CourseWiseFinalPerformancePreview) {
  const width = doc.page.width - PAGE_MARGIN * 2;

  const leftLogo = resolveImagePath([
    'public/images/army_logo.jpeg',
    'public/images/jnu_logo.png',
    'public/images/jnu_logo.jpg',
  ]);
  const rightLogo = resolveImagePath([
    'public/images/eme_logo.jpeg',
    'public/images/brigadier_logo.jpeg',
    'public/images/Military-College-Of-Electronics-Mechanical-Engineering.jpg',
  ]);

  if (leftLogo) {
    doc.image(leftLogo, PAGE_MARGIN, 20, { fit: [42, 42] });
  }
  if (rightLogo) {
    doc.image(rightLogo, doc.page.width - PAGE_MARGIN - 42, 20, { fit: [40, 40] });
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .text(`I - VI TOTAL PERFORMANCE CHART OF ${data.course.code} COURSE`, PAGE_MARGIN, 28, {
      width,
      align: 'center',
      underline: true,
    });
}

function drawPageMeta(
  doc: PDFKit.PDFDocument,
  meta: ReportRenderMeta,
  pageIndex: number,
  totalPages: number
) {
  // Keep footer inside current page bounds and avoid wrapped long-line text
  // that can trigger an implicit page break in PDFKit.
  const y = doc.page.height - PAGE_MARGIN - 10;
  const generatedText = `Generated: ${meta.generatedAt.toISOString().slice(0, 10)}`;
  const pageText = `Page ${pageIndex + 1}/${totalPages}`;

  doc.font('Helvetica').fontSize(7.5);
  doc.text(`Version: ${meta.versionId}`, PAGE_MARGIN, y, {
    lineBreak: false,
  });

  const generatedWidth = doc.widthOfString(generatedText);
  doc.text(generatedText, (doc.page.width - generatedWidth) / 2, y, {
    lineBreak: false,
  });

  const pageWidth = doc.widthOfString(pageText);
  doc.text(pageText, doc.page.width - PAGE_MARGIN - pageWidth, y, {
    lineBreak: false,
  });
}

function computeWidths(doc: PDFKit.PDFDocument) {
  const available = doc.page.width - PAGE_MARGIN * 2;
  const raw = TABLE_COLUMNS.map((column) => COLUMN_BASE_WIDTHS[column.key] ?? 60);
  const sum = raw.reduce((acc, value) => acc + value, 0);
  const ratio = sum > 0 ? available / sum : 1;
  const scaled = raw.map((value) => Math.floor(value * ratio));
  const used = scaled.reduce((acc, value) => acc + value, 0);
  scaled[scaled.length - 1] += available - used;
  return scaled;
}

function buildBoundaries(x0: number, widths: number[]) {
  const xs = [x0];
  for (const width of widths) xs.push(xs[xs.length - 1] + width);
  return xs;
}

function rowsCapacity(doc: PDFKit.PDFDocument, tableStartY: number) {
  const available = doc.page.height - PAGE_MARGIN - PAGE_META_HEIGHT - tableStartY;
  const body = available - TABLE_HEADER_H1 - TABLE_HEADER_H2;
  return Math.max(1, Math.floor(body / DATA_ROW_H));
}

function readCell(row: CourseWiseFinalPerformanceRow, key: (typeof TABLE_COLUMNS)[number]['key']) {
  if (key === 'sNo') return String(row.sNo);
  if (key === 'tesNo') return row.tesNo;
  if (key === 'rank') return row.rank;
  if (key === 'name') return row.name;
  if (key === 'piAllotment') return row.piAllotment ?? '';
  if (key === 'orderOfMerit') return row.orderOfMerit === null ? '' : String(row.orderOfMerit);

  const value = row[key];
  if (typeof value !== 'number') return '';
  return value.toFixed(2);
}

function drawTablePage(
  doc: PDFKit.PDFDocument,
  rows: CourseWiseFinalPerformanceRow[],
  tableStartY: number
) {
  const widths = computeWidths(doc);
  const x0 = PAGE_MARGIN;
  const tableWidth = doc.page.width - PAGE_MARGIN * 2;
  const tableHeight = TABLE_HEADER_H1 + TABLE_HEADER_H2 + rows.length * DATA_ROW_H;
  const xs = buildBoundaries(x0, widths);
  const headerBottom = tableStartY + TABLE_HEADER_H1 + TABLE_HEADER_H2;

  drawRect(doc, x0, tableStartY, tableWidth, tableHeight);
  for (let i = 1; i < xs.length - 1; i += 1) {
    drawLine(doc, xs[i]!, tableStartY, xs[i]!, tableStartY + tableHeight);
  }
  drawLine(doc, x0, tableStartY + TABLE_HEADER_H1, x0 + tableWidth, tableStartY + TABLE_HEADER_H1);
  drawLine(doc, x0, headerBottom, x0 + tableWidth, headerBottom);
  for (let i = 1; i < rows.length; i += 1) {
    const y = headerBottom + i * DATA_ROW_H;
    drawLine(doc, x0, y, x0 + tableWidth, y);
  }

  for (let i = 0; i < TABLE_COLUMNS.length; i += 1) {
    const column = TABLE_COLUMNS[i]!;
    const title = column.max ? `${column.label}\n(${column.max})` : column.label;
    textInBox(doc, title, xs[i]!, tableStartY, widths[i]!, TABLE_HEADER_H1, {
      bold: true,
      size: 7.2,
      lineBreak: true,
    });
    textInBox(doc, `(${String.fromCharCode(97 + i)})`, xs[i]!, tableStartY + TABLE_HEADER_H1, widths[i]!, TABLE_HEADER_H2, {
      bold: true,
      size: 7.2,
    });
  }

  rows.forEach((row, index) => {
    const y = headerBottom + index * DATA_ROW_H;
    TABLE_COLUMNS.forEach((column, colIndex) => {
      textInBox(doc, readCell(row, column.key), xs[colIndex]!, y, widths[colIndex]!, DATA_ROW_H, {
        align: column.key === 'name' || column.key === 'piAllotment' ? 'left' : 'center',
        size: 7.8,
      });
    });
  });
}

export function renderCourseWiseFinalPerformanceTemplate(
  doc: PDFKit.PDFDocument,
  data: CourseWiseFinalPerformancePreview,
  meta: ReportRenderMeta
) {
  const rows = data.rows.length
    ? data.rows
    : [
        {
          ocId: 'none',
          sNo: 1,
          tesNo: '-',
          rank: 'OC',
          name: 'No records',
          academics: 0,
          ptSwimming: 0,
          games: 0,
          olq: 0,
          cfe: 0,
          cdrMarks: 0,
          camp: 0,
          drill: 0,
          grandTotal: 0,
          percentage: 0,
          orderOfMerit: null,
          piAllotment: null,
        },
      ];

  const pages: Array<CourseWiseFinalPerformanceRow[]> = [];
  let cursor = 0;
  let pageIndex = 0;
  while (cursor < rows.length) {
    const startY = pageIndex === 0 ? FIRST_PAGE_TABLE_Y : CONTINUATION_TABLE_Y;
    const cap = rowsCapacity(doc, startY);
    pages.push(rows.slice(cursor, cursor + cap));
    cursor += cap;
    pageIndex += 1;
  }

  const totalPages = pages.length || 1;
  pages.forEach((pageRows, idx) => {
    if (idx > 0) doc.addPage();
    if (idx === 0) {
      drawHeading(doc, data);
    }
    const startY = idx === 0 ? FIRST_PAGE_TABLE_Y : CONTINUATION_TABLE_Y;
    drawTablePage(doc, pageRows, startY);
    drawPageMeta(doc, meta, idx, totalPages);
  });
}
