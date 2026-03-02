import type { CourseWisePerformancePreview, CourseWisePerformanceRow } from '@/types/reports';

type ReportRenderMeta = {
  versionId: string;
  generatedAt: Date;
};

const PAGE_MARGIN = 24;
const FIRST_PAGE_TABLE_Y = 112;
const CONTINUATION_TABLE_Y = 32;
const TABLE_HEADER_H1 = 34;
const TABLE_HEADER_H2 = 18;
const DATA_ROW_H = 20;
const PAGE_META_HEIGHT = 18;

const COLUMN_BASE_WIDTHS: Record<CourseWisePerformancePreview['columns'][number]['key'], number> = {
  serNo: 32,
  tesNo: 44,
  rank: 42,
  name: 152,
  academicsTotal: 80,
  academicsScaled: 82,
  ptSwimming: 74,
  games: 74,
  olq: 62,
  cfe: 72,
  drill: 60,
  camp: 60,
  cdrMarks: 64,
  grandTotal: 70,
  percentage: 50,
};

function termLabel(semester: number): string {
  switch (semester) {
    case 1:
      return 'FIRST';
    case 2:
      return 'SECOND';
    case 3:
      return 'THIRD';
    case 4:
      return 'FOURTH';
    case 5:
      return 'FIFTH';
    case 6:
      return 'SIXTH';
    default:
      return `${semester}TH`;
  }
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
  opts: { align?: 'left' | 'center' | 'right'; bold?: boolean; size?: number } = {}
) {
  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size ?? 8);
  doc.text(text, x + 2, y + 2, {
    width: Math.max(0, width - 4),
    height: Math.max(0, height - 4),
    align: opts.align ?? 'center',
    lineBreak: false,
    ellipsis: true,
  });
}

function drawHeading(doc: PDFKit.PDFDocument, data: CourseWisePerformancePreview) {
  const width = doc.page.width - PAGE_MARGIN * 2;
  const term = termLabel(data.semester);

  doc.font('Helvetica-Bold').fontSize(12).text('MILITARY COLLEGE OF ELECTRONICS & MECHANICAL ENGINEERING', PAGE_MARGIN, 24, {
    width,
    align: 'center',
    underline: true,
  });
  doc.font('Helvetica-Bold').fontSize(12).text('CADETS TRAINING WING', PAGE_MARGIN, 42, {
    width,
    align: 'center',
    underline: true,
  });
  doc.font('Helvetica-Bold').fontSize(12).text(
    `${term} SEMESTER PERFORMANCE CHART OF ${data.course.code} COURSE`,
    PAGE_MARGIN,
    60,
    {
      width,
      align: 'center',
      underline: true,
    }
  );
  doc.font('Helvetica').fontSize(9).text(`Semester: ${data.semester} | Formula: ${data.formulaLabel}`, PAGE_MARGIN, 82, {
    width,
    align: 'center',
  });
}

function drawPageMeta(
  doc: PDFKit.PDFDocument,
  meta: ReportRenderMeta,
  tableStartY: number,
  pageIndex: number,
  totalPages: number
) {
  const y = Math.max(PAGE_MARGIN - 10, tableStartY - 14);
  const width = 240;
  doc.font('Helvetica').fontSize(7.5).text(
    `Version: ${meta.versionId} | Generated: ${meta.generatedAt.toISOString().slice(0, 10)} | Page ${pageIndex + 1}/${totalPages}`,
    doc.page.width - PAGE_MARGIN - width,
    y,
    {
      width,
      align: 'right',
      lineBreak: false,
    }
  );
}

function computeWidths(doc: PDFKit.PDFDocument, data: CourseWisePerformancePreview) {
  const available = doc.page.width - PAGE_MARGIN * 2;
  const raw = data.columns.map((column) => COLUMN_BASE_WIDTHS[column.key] ?? 60);
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

function formatValue(row: CourseWisePerformanceRow, key: CourseWisePerformancePreview['columns'][number]['key']) {
  if (key === 'serNo') return String(row.sNo);
  if (key === 'tesNo') return row.tesNo;
  if (key === 'rank') return row.rank;
  if (key === 'name') return row.name;

  const value = row[key];
  if (typeof value !== 'number') return '';
  if (key === 'percentage') return value.toFixed(2);
  return value.toFixed(2);
}

function rowsCapacity(doc: PDFKit.PDFDocument, tableStartY: number) {
  const available = doc.page.height - PAGE_MARGIN - PAGE_META_HEIGHT - tableStartY;
  const body = available - TABLE_HEADER_H1 - TABLE_HEADER_H2;
  return Math.max(1, Math.floor(body / DATA_ROW_H));
}

function drawTablePage(
  doc: PDFKit.PDFDocument,
  data: CourseWisePerformancePreview,
  rows: CourseWisePerformanceRow[],
  tableStartY: number
) {
  const widths = computeWidths(doc, data);
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

  for (let i = 0; i < data.columns.length; i += 1) {
    const column = data.columns[i]!;
    const title =
      column.maxMarks !== null && column.key !== 'percentage'
        ? `${column.label}\n(MM ${column.maxMarks})`
        : column.label;
    textInBox(doc, title, xs[i]!, tableStartY, widths[i]!, TABLE_HEADER_H1, {
      bold: true,
      size: 7.5,
    });
    textInBox(doc, `(${String.fromCharCode(97 + i)})`, xs[i]!, tableStartY + TABLE_HEADER_H1, widths[i]!, TABLE_HEADER_H2, {
      bold: true,
      size: 7.5,
    });
  }

  rows.forEach((row, index) => {
    const y = headerBottom + index * DATA_ROW_H;
    data.columns.forEach((column, colIndex) => {
      textInBox(doc, formatValue(row, column.key), xs[colIndex]!, y, widths[colIndex]!, DATA_ROW_H, {
        align: column.key === 'name' ? 'left' : 'center',
        size: 8,
      });
    });
  });
}

export function renderCourseWisePerformanceTemplate(
  doc: PDFKit.PDFDocument,
  data: CourseWisePerformancePreview,
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
          academicsTotal: 0,
          academicsScaled: 0,
          ptSwimming: 0,
          games: 0,
          olq: 0,
          cfe: 0,
          drill: 0,
          camp: 0,
          cdrMarks: 0,
          grandTotal: 0,
          percentage: 0,
        },
      ];

  const pages: Array<CourseWisePerformanceRow[]> = [];
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
    drawPageMeta(doc, meta, startY, idx, totalPages);
    drawTablePage(doc, data, pageRows, startY);
  });
}
