import type { ConsolidatedPracticalRow, ConsolidatedSessionalPreview, ConsolidatedTheoryRow } from '@/types/reports';

type ReportRenderMeta = {
  versionId: string;
  preparedBy: string;
  checkedBy: string;
  instructorName?: string;
  generatedAt: Date;
};

const PAGE_MARGIN = 32;
const PAGE_BOTTOM_MARGIN = 30;
const SUMMARY_WIDTH = 122;
const GAP_BETWEEN_TABLES = 8;

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

function safe(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value);
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
  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size ?? 8.5);
  doc.text(text, x + 2, y + 3, {
    width: Math.max(0, width - 4),
    height: Math.max(0, height - 4),
    align: opts.align ?? 'center',
    ellipsis: true,
    lineBreak: false,
  });
}

function drawRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
  doc.rect(x, y, w, h).stroke();
}

function drawLine(doc: PDFKit.PDFDocument, x1: number, y1: number, x2: number, y2: number) {
  doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
}

function drawHeader(
  doc: PDFKit.PDFDocument,
  data: ConsolidatedSessionalPreview,
  sectionTitle: 'Theory' | 'Practical',
  credits: number | null,
  meta: ReportRenderMeta
) {
  const width = doc.page.width - PAGE_MARGIN * 2;
  let y = 28;

  doc.font('Helvetica-Bold').fontSize(12).text('MILITARY COLLEGE OF ELECTRONICS & MECHANICAL ENGINEERING', PAGE_MARGIN, y, {
    width,
    align: 'center',
    underline: true,
  });
  y += 18;

  doc.font('Helvetica-Bold').fontSize(12).text('CADETS TRAINING WING', PAGE_MARGIN, y, {
    width,
    align: 'center',
    underline: true,
  });
  y += 18;

  doc.font('Helvetica-Bold').fontSize(12).text('CONSOLIDATED SESSIONAL MARKSHEET', PAGE_MARGIN, y, {
    width,
    align: 'center',
    underline: true,
  });

  y += 30;
  doc.font('Helvetica-Bold').fontSize(10).text(`COURSE ${data.course.code}-SEM-${semesterToRoman(data.semester)}`, PAGE_MARGIN, y, {
    width: 320,
    align: 'left',
    underline: true,
  });

  y += 22;
  doc.font('Helvetica-Bold').fontSize(10).text(`SUB : ${data.subject.name} (${sectionTitle})`, PAGE_MARGIN, y, {
    width: 520,
    align: 'left',
    underline: true,
  });

  doc.font('Helvetica-Bold').fontSize(10).text(`Credits: ${credits ?? '-'}`, doc.page.width - PAGE_MARGIN - 140, y, {
    width: 140,
    align: 'left',
    underline: true,
  });

  y += 20;
  const instructorLabel = meta.instructorName?.trim() || data.subject.instructorName?.trim() || '-';
  doc.font('Helvetica-Bold').fontSize(10).text(`Instr : ${instructorLabel}`, PAGE_MARGIN, y, {
    width: 560,
    align: 'left',
    underline: true,
  });

  doc.font('Helvetica').fontSize(8).text(`Version: ${meta.versionId}`, doc.page.width - PAGE_MARGIN - 160, y + 1, {
    width: 160,
    align: 'right',
  });

  return y + 22;
}

function drawContinuationHeader(
  doc: PDFKit.PDFDocument,
  data: ConsolidatedSessionalPreview,
  sectionTitle: 'Theory' | 'Practical',
  meta: ReportRenderMeta
) {
  const width = doc.page.width - PAGE_MARGIN * 2;
  const y = PAGE_MARGIN - 4;

  doc.font('Helvetica-Bold').fontSize(11).text('CONSOLIDATED SESSIONAL MARKSHEET (Continued)', PAGE_MARGIN, y, {
    width,
    align: 'center',
  });

  doc
    .font('Helvetica')
    .fontSize(9)
    .text(`COURSE ${data.course.code}-SEM-${semesterToRoman(data.semester)} | SUB: ${data.subject.name} (${sectionTitle})`, PAGE_MARGIN, y + 18, {
      width: width - 150,
      align: 'left',
    });

  doc.font('Helvetica').fontSize(8).text(`Version: ${meta.versionId}`, doc.page.width - PAGE_MARGIN - 140, y + 19, {
    width: 140,
    align: 'right',
  });

  return y + 38;
}

function distributeWidths(total: number, ratios: number[]) {
  const ratioSum = ratios.reduce((sum, value) => sum + value, 0);
  const widths = ratios.map((ratio) => Math.floor((total * ratio) / ratioSum));
  const used = widths.reduce((sum, value) => sum + value, 0);
  widths[widths.length - 1] += total - used;
  return widths;
}

function boundaryXs(startX: number, widths: number[]) {
  const xs = [startX];
  for (const width of widths) xs.push(xs[xs.length - 1] + width);
  return xs;
}

function drawSummaryTable(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  summary: Array<{ grade: string; count: number }>
) {
  const leftW = 72;
  const rightW = SUMMARY_WIDTH - leftW;
  const headerH = 18;
  const rowH = 16;
  const body = [...summary, { grade: 'Total', count: summary.reduce((sum, item) => sum + item.count, 0) }];

  drawRect(doc, x, y, SUMMARY_WIDTH, headerH + body.length * rowH);
  drawLine(doc, x, y + headerH, x + SUMMARY_WIDTH, y + headerH);
  drawLine(doc, x + leftW, y + headerH, x + leftW, y + headerH + body.length * rowH);

  textInBox(doc, 'SUMMARY', x, y, SUMMARY_WIDTH, headerH, { bold: true, size: 9 });

  for (let i = 0; i < body.length; i += 1) {
    const rowY = y + headerH + i * rowH;
    if (i > 0) drawLine(doc, x, rowY, x + SUMMARY_WIDTH, rowY);
    textInBox(doc, body[i]?.grade ?? '', x, rowY, leftW, rowH, { bold: i === body.length - 1 });
    textInBox(doc, String(body[i]?.count ?? 0), x + leftW, rowY, rightW, rowH, { bold: i === body.length - 1 });
  }

  return y + headerH + body.length * rowH;
}

function drawFooter(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  summaryX: number,
  meta: ReportRenderMeta
) {
  doc.font('Helvetica').fontSize(10).text(`Prepared By : ${meta.preparedBy}`, x, y, { underline: true });
  doc.text(`Checked by  : ${meta.checkedBy}`, x, y + 24, { underline: true });
  doc.font('Helvetica-Bold').text('CCO CTW', x, y + 54, { underline: true });
  doc.font('Helvetica').fontSize(8).text(`Generated: ${meta.generatedAt.toISOString().slice(0, 10)}`, summaryX, y + 58, {
    width: SUMMARY_WIDTH,
    align: 'right',
  });
}

function drawTheoryTableOnPage(
  doc: PDFKit.PDFDocument,
  tableX: number,
  startY: number,
  tableW: number,
  rows: ConsolidatedTheoryRow[],
  showPhaseTest2: boolean
) {
  const widths = showPhaseTest2
    ? distributeWidths(tableW, [6, 9, 28, 8, 9, 9, 9, 9, 9, 9, 10])
    : distributeWidths(tableW, [6, 9, 31, 8, 10, 10, 10, 10, 10, 12]);

  const xs = boundaryXs(tableX, widths);
  const header1H = 20;
  const header2H = 18;
  const header3H = 16;
  const rowH = 18;

  const sessionalStart = 4;
  const sessionalEnd = showPhaseTest2 ? 7 : 6;
  const finalIdx = sessionalEnd + 1;
  const totalIdx = finalIdx + 1;
  const gradeIdx = totalIdx + 1;

  const dataCount = Math.max(1, rows.length);
  const tableBottom = startY + header1H + header2H + header3H + dataCount * rowH;

  drawRect(doc, tableX, startY, tableW, tableBottom - startY);

  for (let i = 1; i < widths.length; i += 1) {
    const x = xs[i] ?? tableX;
    const isSessionalInternal = i > sessionalStart && i <= sessionalEnd;
    drawLine(doc, x, isSessionalInternal ? startY + header1H : startY, x, tableBottom);
  }

  drawLine(doc, xs[sessionalStart] ?? tableX, startY + header1H, xs[totalIdx + 1] ?? tableX + tableW, startY + header1H);
  drawLine(doc, xs[sessionalStart] ?? tableX, startY + header1H + header2H, xs[totalIdx + 1] ?? tableX + tableW, startY + header1H + header2H);
  drawLine(doc, tableX, startY + header1H + header2H + header3H, tableX + tableW, startY + header1H + header2H + header3H);

  for (let i = 1; i < dataCount; i += 1) {
    const y = startY + header1H + header2H + header3H + i * rowH;
    drawLine(doc, tableX, y, tableX + tableW, y);
  }

  const first = rows[0];
  const rowspanH = header1H + header2H + header3H;
  textInBox(doc, 'S.No', xs[0]!, startY, widths[0]!, rowspanH, { bold: true });
  textInBox(doc, 'GC No', xs[1]!, startY, widths[1]!, rowspanH, { bold: true });
  textInBox(doc, 'Name', xs[2]!, startY, widths[2]!, rowspanH, { bold: true });
  textInBox(doc, 'Branch', xs[3]!, startY, widths[3]!, rowspanH, { bold: true });
  textInBox(doc, 'Sessional', xs[sessionalStart]!, startY, (xs[sessionalEnd + 1] ?? tableX + tableW) - xs[sessionalStart]!, header1H, {
    bold: true,
  });
  textInBox(doc, 'Final', xs[finalIdx]!, startY, widths[finalIdx]!, header1H + header2H, { bold: true });
  textInBox(doc, 'Total', xs[totalIdx]!, startY, widths[totalIdx]!, header1H + header2H, { bold: true });
  textInBox(doc, 'Letter\nGrade', xs[gradeIdx]!, startY, widths[gradeIdx]!, rowspanH, { bold: true });

  textInBox(doc, 'Ph Test I', xs[4]!, startY + header1H, widths[4]!, header2H, { bold: true });
  if (showPhaseTest2) {
    textInBox(doc, 'Ph Test II', xs[5]!, startY + header1H, widths[5]!, header2H, { bold: true });
    textInBox(doc, 'Tutorial', xs[6]!, startY + header1H, widths[6]!, header2H, { bold: true });
    textInBox(doc, 'Total', xs[7]!, startY + header1H, widths[7]!, header2H, { bold: true });
  } else {
    textInBox(doc, 'Tutorial', xs[5]!, startY + header1H, widths[5]!, header2H, { bold: true });
    textInBox(doc, 'Total', xs[6]!, startY + header1H, widths[6]!, header2H, { bold: true });
  }

  textInBox(doc, `(${first?.phaseTest1Max ?? 20})`, xs[4]!, startY + header1H + header2H, widths[4]!, header3H, { bold: true });
  if (showPhaseTest2) {
    textInBox(doc, `(${first?.phaseTest2Max ?? 20})`, xs[5]!, startY + header1H + header2H, widths[5]!, header3H, {
      bold: true,
    });
    textInBox(doc, `(${first?.tutorialMax ?? 10})`, xs[6]!, startY + header1H + header2H, widths[6]!, header3H, {
      bold: true,
    });
    textInBox(doc, `(${first?.sessionalMax ?? 50})`, xs[7]!, startY + header1H + header2H, widths[7]!, header3H, {
      bold: true,
    });
  } else {
    textInBox(doc, `(${first?.tutorialMax ?? 10})`, xs[5]!, startY + header1H + header2H, widths[5]!, header3H, {
      bold: true,
    });
    textInBox(doc, `(${first?.sessionalMax ?? 50})`, xs[6]!, startY + header1H + header2H, widths[6]!, header3H, {
      bold: true,
    });
  }
  textInBox(doc, `(${first?.finalMax ?? 50})`, xs[finalIdx]!, startY + header1H + header2H, widths[finalIdx]!, header3H, {
    bold: true,
  });
  textInBox(doc, `(${first?.totalMax ?? 100})`, xs[totalIdx]!, startY + header1H + header2H, widths[totalIdx]!, header3H, {
    bold: true,
  });

  const dataRows = rows.length
    ? rows
    : [
        {
          ocId: 'no-data',
          sNo: 1,
          ocNo: '-',
          ocName: 'No records found',
          branch: '-',
          phaseTest1Obtained: null,
          phaseTest1Max: 20,
          phaseTest2Obtained: null,
          phaseTest2Max: 20,
          tutorialObtained: null,
          tutorialMax: 10,
          sessionalObtained: null,
          sessionalMax: 50,
          finalObtained: null,
          finalMax: 50,
          totalObtained: null,
          totalMax: 100,
          letterGrade: null,
        },
      ];

  const bodyStartY = startY + header1H + header2H + header3H;
  dataRows.forEach((row, index) => {
    const y = bodyStartY + index * rowH;
    textInBox(doc, safe(row.sNo), xs[0]!, y, widths[0]!, rowH, { align: 'center' });
    textInBox(doc, safe(row.ocNo), xs[1]!, y, widths[1]!, rowH, { align: 'center' });
    textInBox(doc, safe(row.ocName), xs[2]!, y, widths[2]!, rowH, { align: 'left' });
    textInBox(doc, safe(row.branch), xs[3]!, y, widths[3]!, rowH, { align: 'center' });

    textInBox(doc, safe(row.phaseTest1Obtained), xs[4]!, y, widths[4]!, rowH, { align: 'center' });
    if (showPhaseTest2) {
      textInBox(doc, safe(row.phaseTest2Obtained), xs[5]!, y, widths[5]!, rowH, { align: 'center' });
      textInBox(doc, safe(row.tutorialObtained), xs[6]!, y, widths[6]!, rowH, { align: 'center' });
      textInBox(doc, safe(row.sessionalObtained), xs[7]!, y, widths[7]!, rowH, { align: 'center' });
    } else {
      textInBox(doc, safe(row.tutorialObtained), xs[5]!, y, widths[5]!, rowH, { align: 'center' });
      textInBox(doc, safe(row.sessionalObtained), xs[6]!, y, widths[6]!, rowH, { align: 'center' });
    }

    textInBox(doc, safe(row.finalObtained), xs[finalIdx]!, y, widths[finalIdx]!, rowH, { align: 'center' });
    textInBox(doc, safe(row.totalObtained), xs[totalIdx]!, y, widths[totalIdx]!, rowH, { align: 'center' });
    textInBox(doc, safe(row.letterGrade), xs[gradeIdx]!, y, widths[gradeIdx]!, rowH, { align: 'center' });
  });

  return {
    headerHeight: header1H + header2H + header3H,
    rowHeight: rowH,
    tableBottom,
  };
}

function drawPracticalTableOnPage(
  doc: PDFKit.PDFDocument,
  tableX: number,
  startY: number,
  tableW: number,
  rows: ConsolidatedPracticalRow[]
) {
  const widths = distributeWidths(tableW, [7, 10, 40, 9, 14, 14]);
  const xs = boundaryXs(tableX, widths);

  const header1H = 20;
  const header2H = 16;
  const rowH = 18;

  const dataCount = Math.max(1, rows.length);
  const tableBottom = startY + header1H + header2H + dataCount * rowH;

  drawRect(doc, tableX, startY, tableW, tableBottom - startY);

  for (let i = 1; i < widths.length; i += 1) {
    drawLine(doc, xs[i]!, startY, xs[i]!, tableBottom);
  }

  drawLine(doc, xs[4]!, startY + header1H, xs[5]!, startY + header1H);
  drawLine(doc, tableX, startY + header1H + header2H, tableX + tableW, startY + header1H + header2H);

  for (let i = 1; i < dataCount; i += 1) {
    const y = startY + header1H + header2H + i * rowH;
    drawLine(doc, tableX, y, tableX + tableW, y);
  }

  const first = rows[0];
  const rowspanH = header1H + header2H;
  textInBox(doc, 'S.No', xs[0]!, startY, widths[0]!, rowspanH, { bold: true });
  textInBox(doc, 'GC No', xs[1]!, startY, widths[1]!, rowspanH, { bold: true });
  textInBox(doc, 'Name', xs[2]!, startY, widths[2]!, rowspanH, { bold: true });
  textInBox(doc, 'Branch', xs[3]!, startY, widths[3]!, rowspanH, { bold: true });
  textInBox(doc, 'Practical', xs[4]!, startY, widths[4]!, header1H, { bold: true });
  textInBox(doc, 'Letter\nGrade', xs[5]!, startY, widths[5]!, rowspanH, { bold: true });
  textInBox(doc, `(${first?.practicalMax ?? 0})`, xs[4]!, startY + header1H, widths[4]!, header2H, { bold: true });

  const dataRows = rows.length
    ? rows
    : [
        {
          ocId: 'no-data-practical',
          sNo: 1,
          ocNo: '-',
          ocName: 'No records found',
          branch: '-',
          practicalObtained: null,
          practicalMax: 0,
          letterGrade: null,
        },
      ];

  const bodyStartY = startY + header1H + header2H;
  dataRows.forEach((row, index) => {
    const y = bodyStartY + index * rowH;
    textInBox(doc, safe(row.sNo), xs[0]!, y, widths[0]!, rowH, { align: 'center' });
    textInBox(doc, safe(row.ocNo), xs[1]!, y, widths[1]!, rowH, { align: 'center' });
    textInBox(doc, safe(row.ocName), xs[2]!, y, widths[2]!, rowH, { align: 'left' });
    textInBox(doc, safe(row.branch), xs[3]!, y, widths[3]!, rowH, { align: 'center' });
    textInBox(doc, safe(row.practicalObtained), xs[4]!, y, widths[4]!, rowH, { align: 'center' });
    textInBox(doc, safe(row.letterGrade), xs[5]!, y, widths[5]!, rowH, { align: 'center' });
  });

  return {
    headerHeight: header1H + header2H,
    rowHeight: rowH,
    tableBottom,
  };
}

function paginateTheory(
  doc: PDFKit.PDFDocument,
  data: ConsolidatedSessionalPreview,
  meta: ReportRenderMeta
) {
  const allRows = data.theoryRows;
  const showPhaseTest2 = allRows.some((row) => row.phaseTest2Obtained !== null);
  const summaryItems = data.theorySummary;

  const summaryX = doc.page.width - PAGE_MARGIN - SUMMARY_WIDTH;
  const tableX = PAGE_MARGIN;
  const tableW = summaryX - GAP_BETWEEN_TABLES - tableX;

  let cursor = 0;
  let firstPage = true;
  let finalTableBottom = 0;
  let finalStartY = 0;

  if (allRows.length === 0) {
    const startY = drawHeader(doc, data, 'Theory', data.subject.theoryCredits, meta);
    finalStartY = startY;
    const table = drawTheoryTableOnPage(doc, tableX, startY, tableW, [] as ConsolidatedTheoryRow[], showPhaseTest2);
    finalTableBottom = table.tableBottom;
  } else {
    while (cursor < allRows.length) {
      if (!firstPage) doc.addPage();
      const startY = firstPage
        ? drawHeader(doc, data, 'Theory', data.subject.theoryCredits, meta)
        : drawContinuationHeader(doc, data, 'Theory', meta);

      const headerHeight = 20 + 18 + 16;
      const rowHeight = 18;
      const nonFinalReserve = 20;
      const finalReserve = 95;

      const nonFinalMaxRows = Math.max(
        1,
        Math.floor((doc.page.height - PAGE_BOTTOM_MARGIN - nonFinalReserve - (startY + headerHeight)) / rowHeight)
      );
      const finalMaxRows = Math.max(
        1,
        Math.floor((doc.page.height - PAGE_BOTTOM_MARGIN - finalReserve - (startY + headerHeight)) / rowHeight)
      );

      const remaining = allRows.length - cursor;
      const isFinalPage = remaining <= finalMaxRows;
      const chunkSize = isFinalPage ? remaining : Math.max(1, nonFinalMaxRows);
      const chunk = allRows.slice(cursor, cursor + chunkSize);

      finalStartY = startY;
      const table = drawTheoryTableOnPage(doc, tableX, startY, tableW, chunk, showPhaseTest2);
      finalTableBottom = table.tableBottom;

      cursor += chunkSize;
      firstPage = false;
    }
  }

  const summaryY = finalStartY + (20 + 18 + 16) + 18;
  const summaryBottom = drawSummaryTable(doc, summaryX, summaryY, summaryItems);
  let footerY = Math.max(finalTableBottom + 14, summaryBottom + 10);

  if (footerY + 80 > doc.page.height - PAGE_BOTTOM_MARGIN) {
    doc.addPage();
    footerY = PAGE_MARGIN + 16;
  }

  drawFooter(doc, tableX, footerY, summaryX, meta);
}

function paginatePractical(
  doc: PDFKit.PDFDocument,
  data: ConsolidatedSessionalPreview,
  meta: ReportRenderMeta
) {
  const allRows = data.practicalRows;
  const summaryItems = data.practicalSummary;

  const summaryX = doc.page.width - PAGE_MARGIN - SUMMARY_WIDTH;
  const tableX = PAGE_MARGIN;
  const tableW = summaryX - GAP_BETWEEN_TABLES - tableX;

  let cursor = 0;
  let firstPage = true;
  let finalTableBottom = 0;
  let finalStartY = 0;

  if (allRows.length === 0) {
    const startY = drawHeader(doc, data, 'Practical', data.subject.practicalCredits, meta);
    finalStartY = startY;
    const table = drawPracticalTableOnPage(doc, tableX, startY, tableW, [] as ConsolidatedPracticalRow[]);
    finalTableBottom = table.tableBottom;
  } else {
    while (cursor < allRows.length) {
      if (!firstPage) doc.addPage();
      const startY = firstPage
        ? drawHeader(doc, data, 'Practical', data.subject.practicalCredits, meta)
        : drawContinuationHeader(doc, data, 'Practical', meta);

      const headerHeight = 20 + 16;
      const rowHeight = 18;
      const nonFinalReserve = 20;
      const finalReserve = 95;

      const nonFinalMaxRows = Math.max(
        1,
        Math.floor((doc.page.height - PAGE_BOTTOM_MARGIN - nonFinalReserve - (startY + headerHeight)) / rowHeight)
      );
      const finalMaxRows = Math.max(
        1,
        Math.floor((doc.page.height - PAGE_BOTTOM_MARGIN - finalReserve - (startY + headerHeight)) / rowHeight)
      );

      const remaining = allRows.length - cursor;
      const isFinalPage = remaining <= finalMaxRows;
      const chunkSize = isFinalPage ? remaining : Math.max(1, nonFinalMaxRows);
      const chunk = allRows.slice(cursor, cursor + chunkSize);

      finalStartY = startY;
      const table = drawPracticalTableOnPage(doc, tableX, startY, tableW, chunk);
      finalTableBottom = table.tableBottom;

      cursor += chunkSize;
      firstPage = false;
    }
  }

  const summaryY = finalStartY + (20 + 16) + 18;
  const summaryBottom = drawSummaryTable(doc, summaryX, summaryY, summaryItems);
  let footerY = Math.max(finalTableBottom + 14, summaryBottom + 10);

  if (footerY + 80 > doc.page.height - PAGE_BOTTOM_MARGIN) {
    doc.addPage();
    footerY = PAGE_MARGIN + 16;
  }

  drawFooter(doc, tableX, footerY, summaryX, meta);
}

export function renderConsolidatedSessionalTemplate(
  doc: PDFKit.PDFDocument,
  data: ConsolidatedSessionalPreview,
  meta: ReportRenderMeta
) {
  if (data.subject.hasTheory) {
    paginateTheory(doc, data, meta);
  }

  if (data.subject.hasPractical) {
    if (data.subject.hasTheory) doc.addPage();
    paginatePractical(doc, data, meta);
  }
}
