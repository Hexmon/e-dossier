import fs from 'node:fs';
import path from 'node:path';
import type { FinalResultCompilationPreview } from '@/types/reports';

type IdentityRow = {
  enrolmentNumber: string;
  certSerialNo: string;
};

type ReportRenderMeta = {
  versionId: string;
  generatedAt: Date;
  preparedBy: string;
  checkedBy: string;
  identityByOcId: Record<string, IdentityRow>;
};

const PAGE_MARGIN = 28;
const FIRST_PAGE_TABLE_START_Y = 116;
const CONTINUATION_TABLE_START_Y = 34;
const TABLE_HEADER_HEIGHT = 78;
const CREDITS_ROW_HEIGHT = 16;
const DATA_ROW_HEIGHT = 22;
const PAGE_META_HEIGHT = 24;
const SIGNATURE_BLOCK_HEIGHT = 72;
const SIGNATURE_GAP_FROM_TABLE = 24;

function semesterToRoman(semester: number): string {
  const map: Record<number, string> = {
    1: 'I',
    2: 'II',
    3: 'III',
    4: 'IV',
    5: 'V',
    6: 'VI',
  };
  return map[semester] ?? String(semester);
}

function semesterWord(semester: number): string {
  const map: Record<number, string> = {
    1: 'ONE',
    2: 'TWO',
    3: 'THREE',
    4: 'FOUR',
    5: 'FIVE',
    6: 'SIX',
  };
  return map[semester] ?? String(semester);
}

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
  opts: { align?: 'left' | 'center' | 'right'; bold?: boolean; size?: number } = {}
) {
  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size ?? 8);
  doc.text(text, x + 2, y + 2, {
    width: Math.max(0, width - 4),
    height: Math.max(0, height - 4),
    align: opts.align ?? 'center',
    lineBreak: true,
    ellipsis: true,
  });
}

function textVerticalCenter(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  opts: { bold?: boolean; size?: number } = {}
) {
  const label = text.trim();
  const fontSize = opts.size ?? 7.4;
  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);

  doc.save();
  doc.translate(x + width / 2, y + height / 2);
  doc.rotate(-90);
  doc.text(label, -height / 2 + 2, -fontSize / 2, {
    width: Math.max(0, height - 4),
    align: 'center',
    lineBreak: false,
    ellipsis: true,
  });
  doc.restore();
}

function drawInstitutionHeader(doc: PDFKit.PDFDocument, data: FinalResultCompilationPreview) {
  const contentWidth = doc.page.width - PAGE_MARGIN * 2;
  const semRoman = semesterToRoman(data.semester);
  const semWord = semesterWord(data.semester);

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
    doc.image(leftLogo, PAGE_MARGIN, 18, { fit: [52, 52] });
  }
  if (rightLogo) {
    doc.image(rightLogo, doc.page.width - PAGE_MARGIN - 50, 18, { fit: [48, 48] });
  }

  doc.font('Helvetica-Bold').fontSize(12).text('MILITARY COLLEGE OF ELECTRONICS & MECHANICAL ENGINEERING', PAGE_MARGIN, 22, {
    width: contentWidth,
    align: 'center',
    underline: true,
  });
  doc.font('Helvetica-Bold').fontSize(12).text('CADETS TRAINING WING', PAGE_MARGIN, 40, {
    width: contentWidth,
    align: 'center',
    underline: true,
  });
  doc.font('Helvetica-Bold').fontSize(12).text(
    `SEMESTER-${semRoman} (${semWord}) RESULT OF COURSE SER NO ${data.course.code}`,
    PAGE_MARGIN,
    58,
    {
      width: contentWidth,
      align: 'center',
      underline: true,
    }
  );
}

function drawPageMeta(
  doc: PDFKit.PDFDocument,
  meta: ReportRenderMeta,
  pageIndex: number,
  totalPages: number
) {
  const y = doc.page.height - PAGE_MARGIN - PAGE_META_HEIGHT + 4;
  const contentWidth = doc.page.width - PAGE_MARGIN * 2;
  doc.font('Helvetica').fontSize(7.4).text(
    `Prepared by: ${meta.preparedBy}    Checked by: ${meta.checkedBy}`,
    PAGE_MARGIN,
    y,
    { width: contentWidth, align: 'left', lineBreak: false }
  );
  doc.text(
    `Version: ${meta.versionId}    Generated: ${meta.generatedAt.toISOString().slice(0, 10)}    Page ${pageIndex + 1}/${totalPages}`,
    PAGE_MARGIN,
    y,
    { width: contentWidth, align: 'right', lineBreak: false }
  );
}

function drawSignatureBlock(doc: PDFKit.PDFDocument, startY: number) {
  const contentWidth = doc.page.width - PAGE_MARGIN * 2;
  const sectionWidth = contentWidth / 6;
  const labels = [
    '(CCO, CTW)',
    '(Cdr, CTW)',
    '(JNU)',
    '(JNU)',
    '(Dy Comdt & CI, MCEME)',
    '(Comdt, MCEME)',
  ];

  for (let i = 0; i < labels.length; i += 1) {
    const x = PAGE_MARGIN + i * sectionWidth;
    drawLine(doc, x + 8, startY, x + sectionWidth - 8, startY);
    doc.font('Helvetica').fontSize(8).text(labels[i] ?? '', x, startY + 5, {
      width: sectionWidth,
      align: 'center',
      lineBreak: false,
    });
  }
}

function buildColumnWidths(doc: PDFKit.PDFDocument, subjectColumnsCount: number) {
  const contentWidth = doc.page.width - PAGE_MARGIN * 2;

  const base = {
    serNo: 28,
    tesNo: 40,
    name: 98,
    enrolmentNo: 92,
    certNo: 82,
    prevPoints: 40,
    prevCgpa: 40,
    semPoints: 40,
    semSgpa: 40,
    uptoPoints: 40,
    uptoCgpa: 40,
  };

  const fixedSum =
    base.serNo +
    base.tesNo +
    base.name +
    base.enrolmentNo +
    base.certNo +
    base.prevPoints +
    base.prevCgpa +
    base.semPoints +
    base.semSgpa +
    base.uptoPoints +
    base.uptoCgpa;

  const remaining = Math.max(0, contentWidth - fixedSum);
  const perSubject = subjectColumnsCount > 0 ? Math.max(20, Math.floor(remaining / subjectColumnsCount)) : 0;
  const consumed = fixedSum + perSubject * subjectColumnsCount;
  const correction = contentWidth - consumed;

  return {
    ...base,
    subject: perSubject,
    correction,
  };
}

function formatCgpa(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return value.toFixed(2);
}

function drawTablePage(
  doc: PDFKit.PDFDocument,
  data: FinalResultCompilationPreview,
  meta: ReportRenderMeta,
  rows: FinalResultCompilationPreview['rows'],
  y0: number
) {
  const widths = buildColumnWidths(doc, data.subjectColumns.length);
  const previousSemesterLabel = data.semester > 1 ? String(data.semester - 1) : '0';
  const x0 = PAGE_MARGIN;
  const tableWidth = doc.page.width - PAGE_MARGIN * 2;
  const tableHeight = TABLE_HEADER_HEIGHT + CREDITS_ROW_HEIGHT + rows.length * DATA_ROW_HEIGHT;
  const tableHeaderBottomY = y0 + TABLE_HEADER_HEIGHT;
  const creditsBottomY = tableHeaderBottomY + CREDITS_ROW_HEIGHT;

  const columnWidths: number[] = [
    widths.serNo,
    widths.tesNo,
    widths.name,
    widths.enrolmentNo,
    widths.certNo,
    widths.prevPoints,
    widths.prevCgpa,
    ...data.subjectColumns.map(() => widths.subject),
    widths.semPoints,
    widths.semSgpa,
    widths.uptoPoints,
    widths.uptoCgpa + widths.correction,
  ];

  const xBoundaries = [x0];
  for (const width of columnWidths) xBoundaries.push(xBoundaries[xBoundaries.length - 1] + width);

  drawRect(doc, x0, y0, tableWidth, tableHeight);
  for (let i = 1; i < xBoundaries.length - 1; i += 1) {
    const x = xBoundaries[i] ?? x0;
    drawLine(doc, x, y0, x, y0 + tableHeight);
  }

  drawLine(doc, x0, tableHeaderBottomY, x0 + tableWidth, tableHeaderBottomY);
  drawLine(doc, x0, creditsBottomY, x0 + tableWidth, creditsBottomY);
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const y = creditsBottomY + rowIndex * DATA_ROW_HEIGHT;
    drawLine(doc, x0, y, x0 + tableWidth, y);
  }

  const fixedHeaders = [
    'Ser No',
    'TES No',
    'Name',
    'Enrolment Number',
    'Cert Ser No',
    `Upto Semester ${previousSemesterLabel}\nCumulative Grade Point\nAverage (CGPA)\nPoints`,
    `Upto Semester ${previousSemesterLabel}\nCumulative Grade Point\nAverage (CGPA)`,
  ];

  for (let i = 0; i < fixedHeaders.length; i += 1) {
    textInBox(doc, fixedHeaders[i] ?? '', xBoundaries[i]!, y0, columnWidths[i]!, TABLE_HEADER_HEIGHT, {
      bold: true,
      size: 7.6,
    });
  }

  const subjectStartIndex = fixedHeaders.length;
  for (let i = 0; i < data.subjectColumns.length; i += 1) {
    const subject = data.subjectColumns[i]!;
    const label = `${subject.subjectCode}\n${subject.subjectName}`;
    textVerticalCenter(
      doc,
      label,
      xBoundaries[subjectStartIndex + i]!,
      y0,
      columnWidths[subjectStartIndex + i]!,
      TABLE_HEADER_HEIGHT,
      { bold: true, size: 7.1 }
    );
  }

  const tailHeaders = [
    `Semester ${data.semester}\nSemester Grade Point\nAverage (SGPA)\nPoints`,
    `Semester ${data.semester}\nSemester Grade Point\nAverage (SGPA)`,
    `Upto Semester ${data.semester}\nCumulative Grade Point\nAverage (CGPA)\nPoints`,
    `Upto Semester ${data.semester}\nCumulative Grade Point\nAverage (CGPA)`,
  ];
  for (let i = 0; i < tailHeaders.length; i += 1) {
    const idx = subjectStartIndex + data.subjectColumns.length + i;
    textInBox(doc, tailHeaders[i] ?? '', xBoundaries[idx]!, y0, columnWidths[idx]!, TABLE_HEADER_HEIGHT, {
      bold: true,
      size: 7.3,
    });
  }

  textInBox(doc, 'Credits =====>', xBoundaries[2]!, tableHeaderBottomY, columnWidths[2]!, CREDITS_ROW_HEIGHT, {
    align: 'left',
    bold: true,
    size: 7.2,
  });
  for (let i = 0; i < data.subjectColumns.length; i += 1) {
    const idx = subjectStartIndex + i;
    const col = data.subjectColumns[i]!;
    textInBox(
      doc,
      `${col.kind}\n(${col.credits})`,
      xBoundaries[idx]!,
      tableHeaderBottomY,
      columnWidths[idx]!,
      CREDITS_ROW_HEIGHT,
      { bold: true, size: 6.8 }
    );
  }
  const semPointsIdx = subjectStartIndex + data.subjectColumns.length;
  textInBox(
    doc,
    `[SGPA]\n(${data.semesterCreditsTotal})`,
    xBoundaries[semPointsIdx]!,
    tableHeaderBottomY,
    columnWidths[semPointsIdx]!,
    CREDITS_ROW_HEIGHT,
    { bold: true, size: 6.8 }
  );
  textInBox(
    doc,
    `[CGPA]\n(${data.uptoSemesterCreditsReference || '-'})`,
    xBoundaries[semPointsIdx + 2]!,
    tableHeaderBottomY,
    columnWidths[semPointsIdx + 2]!,
    CREDITS_ROW_HEIGHT,
    { bold: true, size: 6.8 }
  );

  rows.forEach((row, pageRowIndex) => {
    const y = creditsBottomY + pageRowIndex * DATA_ROW_HEIGHT;
    const identity = meta.identityByOcId[row.ocId];

    const fixedValues = [
      String(row.sNo),
      row.tesNo,
      row.name,
      identity?.enrolmentNumber ?? '',
      identity?.certSerialNo ?? '',
      String(row.previousCumulativePoints),
      formatCgpa(row.previousCumulativeCgpa),
    ];
    for (let i = 0; i < fixedValues.length; i += 1) {
      textInBox(doc, fixedValues[i] ?? '', xBoundaries[i]!, y, columnWidths[i]!, DATA_ROW_HEIGHT, {
        align: i === 2 ? 'left' : 'center',
        size: 8,
      });
    }

    for (let i = 0; i < data.subjectColumns.length; i += 1) {
      const idx = subjectStartIndex + i;
      const col = data.subjectColumns[i]!;
      textInBox(doc, row.subjectGrades[col.key] ?? '', xBoundaries[idx]!, y, columnWidths[idx]!, DATA_ROW_HEIGHT, {
        align: 'center',
        size: 8,
      });
    }

    const tailValues = [
      String(row.semesterPoints),
      formatCgpa(row.semesterSgpa),
      String(row.uptoSemesterPoints),
      formatCgpa(row.uptoSemesterCgpa),
    ];
    for (let i = 0; i < tailValues.length; i += 1) {
      const idx = semPointsIdx + i;
      textInBox(doc, tailValues[i] ?? '', xBoundaries[idx]!, y, columnWidths[idx]!, DATA_ROW_HEIGHT, {
        align: 'center',
        size: 8,
      });
    }
  });

  return {
    tableBottomY: y0 + tableHeight,
  };
}

function rowsCapacity(
  doc: PDFKit.PDFDocument,
  tableStartY: number,
  reserveAfterTable: number
) {
  const available = doc.page.height - PAGE_MARGIN - PAGE_META_HEIGHT - reserveAfterTable - tableStartY;
  const body = available - TABLE_HEADER_HEIGHT - CREDITS_ROW_HEIGHT;
  return Math.max(1, Math.floor(body / DATA_ROW_HEIGHT));
}

export function renderFinalResultCompilationTemplate(
  doc: PDFKit.PDFDocument,
  data: FinalResultCompilationPreview,
  meta: ReportRenderMeta
) {
  const allRows = data.rows.length
    ? data.rows
    : [
        {
          ocId: 'none',
          sNo: 1,
          tesNo: '-',
          name: 'No records',
          previousCumulativePoints: 0,
          previousCumulativeCredits: 0,
          previousCumulativeCgpa: null,
          semesterPoints: 0,
          semesterCredits: data.semesterCreditsTotal,
          semesterSgpa: null,
          uptoSemesterPoints: 0,
          uptoSemesterCredits: 0,
          uptoSemesterCgpa: null,
          subjectGrades: {},
        },
      ];

  const pages: Array<{ rows: typeof allRows; isLast: boolean }> = [];
  let cursor = 0;
  let pageIndex = 0;

  while (cursor < allRows.length) {
    const startY = pageIndex === 0 ? FIRST_PAGE_TABLE_START_Y : CONTINUATION_TABLE_START_Y;
    const capNormal = rowsCapacity(doc, startY, 0);
    const capLast = rowsCapacity(doc, startY, SIGNATURE_BLOCK_HEIGHT);
    const remaining = allRows.length - cursor;
    let isLast = false;
    let take = 0;

    if (remaining <= capLast) {
      isLast = true;
      take = remaining;
    } else if (remaining <= capNormal) {
      // Leave a dedicated final page with signature reserve.
      take = Math.max(1, remaining - capLast);
    } else {
      take = capNormal;
    }

    pages.push({
      rows: allRows.slice(cursor, cursor + take),
      isLast,
    });
    cursor += take;
    pageIndex += 1;
  }

  const totalPages = pages.length || 1;
  pages.forEach((page, idx) => {
    if (idx > 0) doc.addPage();
    if (idx === 0) {
      drawInstitutionHeader(doc, data);
    }

    const startY = idx === 0 ? FIRST_PAGE_TABLE_START_Y : CONTINUATION_TABLE_START_Y;
    const { tableBottomY } = drawTablePage(doc, data, meta, page.rows, startY);

    if (page.isLast) {
      // Keep signatures at end of table while guaranteeing visibility on page.
      const signatureYMin = tableBottomY + SIGNATURE_GAP_FROM_TABLE;
      const signatureYMax = doc.page.height - PAGE_MARGIN - PAGE_META_HEIGHT - 18;
      const signatureY = Math.min(signatureYMin, signatureYMax);
      drawSignatureBlock(doc, signatureY);
    }

    drawPageMeta(doc, meta, idx, totalPages);
  });
}
